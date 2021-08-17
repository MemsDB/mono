import { Debugger } from 'debug'
import { App, Request, Response } from '@tinyhttp/app'
import { v4, validate } from 'uuid'
import { cloneDeep, merge } from 'smoldash'
import { json } from 'milliparsec'
import { verify, sign, Secret, Jwt } from 'jsonwebtoken'
import { pbkdf2Sync, randomBytes } from 'crypto'
import { logger } from '@tinyhttp/logger'

import {
  DB,
  DBCollection,
  EventHandler,
  populate,
  QueryBuilder,
} from '@memsdb/core'
import type { EventDBAddCollection, DBDoc } from '@memsdb/types'

interface ExtendedRequest extends Request {
  auth?: {
    authId: string
    acl: string[]
    type: string
  }
  timings?: {
    func: string
    time: number
  }[]
}

interface Auth {
  acl: string[]
  username: string
  type: 'password' | 'api'
  hash: string
  salt: string
  allowedTokens: number
}

interface Token {
  expiry: number
  for: string
  token: string
  valid: boolean
}

export class MemsDBServer {
  private db: DB
  private _: Debugger
  private app: App
  /**
   * JWT signing secret
   */
  private secret: Secret
  /**
   * Iterations for hashing strings
   */
  private static keyIterations = 1000
  /**
   * Key length for hashed keys in auth table
   */
  private static keyLength = 512
  /**
   * Maximum expiry for a token in seconds
   */
  private tokenExpiry = 86400
  /**
   * Require authentication for routes
   */
  private requireAuth: 'none' | 'all' = 'all'

  readonly port: number

  constructor(
    db: DB,
    opts: {
      /** Defaults to 16055 */
      port?: number
      /** JWT signing secret */
      secret?: Secret
      /** Password for the root user */
      rootPassword?: string
      /** How long a JWT token should stay active for (in seconds) */
      tokenExpiry?: number
      /** Require Auth */
      requireAuth?: 'none' | 'all'
    } = {}
  ) {
    const {
      port = 16055,
      secret = v4(),
      rootPassword = v4(),
      tokenExpiry = 86400,
      requireAuth = 'all',
    } = opts

    // Initialise debugger variable
    const _ = (this._ = db.db_.extend(`<plugin>http`))

    this.db = db
    this.port = port
    this.app = new App()
    this.secret = secret
    this.tokenExpiry = tokenExpiry
    this.requireAuth = requireAuth

    this.app.settings.xPoweredBy = 'MemsDB HTTP'

    this.app.use(
      logger({
        emoji: true,
        ip: true,
        methods: ['GET', 'POST', 'HEAD', 'OPTIONS'],
        output: {
          color: true,
          callback: console.log,
        },
        timestamp: true,
      })
    )
    this.app.use(json())

    // Create internal collections for things like Auth and tokens
    /* DEBUG */ _('Creating internal auth collection')
    const authCollection = new DBCollection(db, {
      name: '<plugin:http>auth',
      structure: {
        acl: [],
        username: '',
        type: 'password',
        hash: '',
        salt: '',
        allowedTokens: 3,
      } as Auth,
    })

    /* DEBUG */ _('Creating internal tokens collection')
    new DBCollection(db, {
      name: '<plugin:http>tokens',
      structure: {
        expiry: 0,
        for: '',
        token: '',
        valid: true,
      } as Token,
    })

    /* DEBUG */ _('Finding root user account')
    const [rootUser] = authCollection.find(
      QueryBuilder.where('username', '===', 'root')
    )
    // If no root user was found, create one
    if (!rootUser) {
      /* DEBUG */ _('root user not found, creating new user')

      /* DEBUG */ _('Generating salt for root user')
      const salt = randomBytes(256).toString('base64')

      /* DEBUG */ _(
        'Inserting user "root". Note down the password: %s',
        rootPassword
      )
      authCollection.insert({
        doc: {
          username: 'root',
          salt,
          hash: MemsDBServer.saltHashString(rootPassword, salt),
          acl: ['*/*'],
          allowedTokens: 0,
          type: 'password',
        } as Auth,
      })
    }

    // Register internal authentication routes
    this.registerAuthRoutes()

    // Register collections for handling collection additions
    /* DEBUG */ _('Looping over DB collections to register paths')
    db.collections.forEach(collection => {
      this.registerCollection(collection as DBCollection<any>)
    })
    /* DEBUG */ _('Finished looping over DB collections to register paths')

    /* DEBUG */ _('Registering Event handlers')
    db.addEventHandler(this.DBEventHandlers)
    /* DEBUG */ _('Finished registering event handlers')

    this.app.listen(port, () => {
      /* DEBUG */ _('MemsDB HTTP Server listening on port %d', port)
    })
  }

  private DBEventHandlers = [
    new EventHandler('EventDBAddCollection', event => {
      const { collection } = event as EventDBAddCollection

      this.registerCollection(collection as DBCollection<any>)
    }),
  ]

  /**
   * Register the default paths for a collection
   * @param collection Collection to register
   * @ignore
   */
  private registerCollection(collection: DBCollection<any>) {
    const _reg = this._.extend(`/collection/${collection.name}`)

    if (collection.name.startsWith('<plugin:http>')) {
      /* DEBUG */ _reg("Skipping collection as it's an HTTP plugin internal")
      return
    }
    /* DEBUG */ this._('Registering collection paths for "%s"', collection.name)
    
    // Register findByID route
    this.app.get(
      `/collection/${collection.name}/findByID/:id`,
      (req: ExtendedRequest, res) => {
        const _ = _reg.extend('<path>/findByID/:id')
        const start = Date.now()

        /* DEBUG */ _('Parsing auth token')
        this.parseAuthToken(req)
        /* DEBUG */ _('Finished parsing auth token')

        if (this.requireAuth && !this.testACL(req, '')) {
          /* DEBUG */ _('Failed auth check. Auth required for all routes')
          return this.json(
            res,
            {
              errors: 'You must be logged in for this',
            },
            403
          )
        }

        const { id = '' } = req.params as { id?: string }

        const errors: string[] = []

        if (!id || id === '') {
          /* DEBUG */ _('No ID passed in parameters, returning error')
          return this.json(
            res,
            {
              error: 'ID not specified',
            },
            400
          )
        }

        /* DEBUG */ _('Finding document in collection')
        const doc = collection.id(id)

        if (!doc) {
          /* DEBUG */ _(
            'Document not found for ID "%s", returning errors array',
            id
          )
          errors.push('Document not found for that ID')
          return this.json(res, {
            errors,
          })
        }

        /* DEBUG */ _('Populating documents with MemsPL query')
        const {
          slice: [populated],
          populateFilterUnspecified,
          populateQuery,
          errors: populateErrors,
        } = this.memsdbPopulate(_, req, collection, [doc])
        /* DEBUG */ _('Finished populating documents')

        populateErrors.length > 0 && errors.push(...populateErrors)

        /* DEBUG */ _('Constructing response object')
        const responseObj: {
          doc: DBDoc<any>
          errors: string[]
          populateFilterUnspecified: boolean | string
          populateQuery: string
          totalTime?: number
        } = {
          doc: populated as DBDoc<any>,
          errors,
          populateFilterUnspecified,
          populateQuery,
        }

        if (process.env.DEBUG) {
          responseObj.totalTime = Date.now() - start
        }

        /* DEBUG */ _('Sending response')
        return this.json(res, responseObj)
      }
    )
    /* DEBUG */ _reg(
      'Registered path "%s"',
      `/collection/${collection.name}/findByID/:id`
    )

    // Register find route
    this.app.get(
      `/collection/${collection.name}/find`,
      (req: ExtendedRequest, res) => {
        const _ = _reg.extend('<path>/find')
        const start = Date.now()

        /* DEBUG */ _('Parsing auth token')
        this.parseAuthToken(req)
        /* DEBUG */ _('Finished parsing auth token')

        if (this.requireAuth && !this.testACL(req, '')) {
          /* DEBUG */ _('Failed auth check. Auth required for all routes')
          return this.json(
            res,
            {
              errors: 'You must be logged in for this',
            },
            403
          )
        }

        const {
          status: findStatus,
          slice: findSlice,
          errors: findErrors,
          total: findTotal,
          query: findQueries,
        } = this.memsdbFind(_, req, collection)

        const {
          status: limitOffsetStatus,
          slice: limitOffsetSlice,
          offset,
          limit,
          errors: limitOffsetErrors,
        } = this.memsdbLimitOffset(_, req, findSlice)

        const {
          slice: populateSlice,
          populateFilterUnspecified,
          populateQuery,
          errors: populateErrors,
        } = this.memsdbPopulate(_, req, collection, limitOffsetSlice)

        const responseObj: {
          docs: DBDoc<any>[]
          offset: number
          limit: number
          populateQuery: string
          populateFilterUnspecified: string | boolean
          total: number
          query: string
          errors: string[]
          totalTime?: number
        } = {
          docs: populateSlice as DBDoc<any>[],
          offset,
          limit,
          populateQuery,
          populateFilterUnspecified,
          total: populateSlice.length,
          query: findQueries,
          errors: [],
        }

        findErrors.length > 0 && responseObj.errors.push(...findErrors)
        limitOffsetErrors.length > 0 &&
          responseObj.errors.push(...limitOffsetErrors)
        populateErrors.length > 0 && responseObj.errors.push(...populateErrors)

        if (process.env.DEBUG) {
          responseObj.totalTime = Date.now() - start
        }

        return this.json(res, responseObj)
      }
    )
    /* DEBUG */ _reg(
      'Registered path "%s"',
      `/collection/${collection.name}/find`
    )

    // Register insert route
    this.app.put(`/collection/${collection.name}/insert`, (req, res) => {
      const _ = _reg.extend('<path>/insert')
      const start = Date.now()

      /* DEBUG */ _('Parsing auth token')
      this.parseAuthToken(req)
      /* DEBUG */ _('Finished parsing auth token')

      if (this.requireAuth && !this.testACL(req, '')) {
        /* DEBUG */ _('Failed auth check. Auth required for all routes')
        return this.json(
          res,
          {
            errors: 'You must be logged in for this',
          },
          403
        )
      }

      const { reactiveUpdate: reactiveUpdateString = 'true', id } = req.query as {
        doc: string
        reactiveUpdate: string
        id?: string
      }

      const { doc: docData } = req.body as {
        doc: Record<string, any>
      }

      if (!docData) {
        /* DEBUG */ _('No doc provided in body, returning error')
        return this.json(res, { error: 'No valid document body provided' }, 400)
      }

      const reactiveUpdate = reactiveUpdateString === 'true' ? true : false

      /* DEBUG */ _(
        'Constructing doc from collection schema and doc string passed in from the user'
      )
      const docObject = merge(cloneDeep(collection.schema), docData)
      /* DEBUG */ _('Finished constructing doc data object')

      /* DEBUG */ _('Inserting document into database')
      const doc = collection.insert({
        doc: docObject,
        reactiveUpdate,
        id
      })
      /* DEBUG */ _('Finished inserting document')

      const responseObj: {
        doc: DBDoc<any>
        totalTime?: number
      } = {
        doc,
      }

      if (process.env.DEBUG) {
        responseObj.totalTime = Date.now() - start
      }

      return this.json(res, responseObj)
    })
    /* DEBUG */ _reg(
      'Registered path "%s"',
      `/collection/${collection.name}/insert`
    )

    // Regiter set route for changing documents
    this.app.patch(`/collection/${collection.name}/set/:id`, (req, res) => {
      const _ = _reg.extend('<path>/set/:id')
      const start = Date.now()

      /* DEBUG */ _('Parsing auth token')
      this.parseAuthToken(req)
      /* DEBUG */ _('Finished parsing auth token')

      if (this.requireAuth && !this.testACL(req, '')) {
        /* DEBUG */ _('Failed auth check. Auth required for all routes')
        return this.json(
          res,
          {
            errors: 'You must be logged in for this',
          },
          403
        )
      }

      const { data: docData, key: docKey } = req.body as {
        data: Record<string, any>
        key: string
      }

      const { id = '' } = req.params as { id?: string }

      const errors: string[] = []

      if (!id || id === '') {
        /* DEBUG */ _('No ID passed in parameters, returning error')
        return this.json(
          res,
          {
            error: 'ID not specified',
          },
          400
        )
      }

      if (!docData) {
        /* DEBUG */ _('No doc provided in body, returning error')
        return this.json(res, { error: 'No valid document body provided' }, 400)
      }

      /* DEBUG */ _('Finding document in collection')
      const doc = collection.id(id)

      /**
       * If there's no document, return an error for the request
       */
      if (!doc) {
        /* DEBUG */ _(
          'Document not found for ID "%s", returning errors array',
          id
        )
        errors.push('Document not found for that ID')
        return this.json(res, {
          errors,
        })
      }

      /**
       * Set the document key to the specified data from the body of the request
       */
      /* DEBUG */ _('Setting document data')
      doc.set(docKey, docData)

      /**
       * Populate the document so as to remove keys, user must pass in a
       * populate query to see the results of the .set() operation
       */
      /* DEBUG */ _('Populating document with MemsPL query')
      const {
        slice: [populated],
        populateFilterUnspecified,
        populateQuery,
        errors: populateErrors,
      } = this.memsdbPopulate(_, req, collection, [doc])
      /* DEBUG */ _('Finished populating documents')

      /**
       * Construct the response object to contain the population details as
       * any errors that occurred
       */
      const responseObj: {
        doc: DBDoc<any>
        totalTime?: number
        errors: string[]
        populateFilterUnspecified: boolean
        populateQuery: string
      } = {
        doc: populated,
        errors: [...populateErrors],
        populateFilterUnspecified,
        populateQuery,
      }

      /**
       * Add totalTime parameter if this is debug
       */
      if (process.env.DEBUG) {
        responseObj.totalTime = Date.now() - start
      }

      return this.json(res, responseObj)
    })
    /* DEBUG */ _reg(
      'Registered path "%s"',
      `/collection/${collection.name}/set/:id`
    )

    // Regiter set route for changing multiple fields in a document
    this.app.patch(`/collection/${collection.name}/setData/:id`, (req, res) => {
      const _ = _reg.extend('<path>/set/:id')
      const start = Date.now()

      /* DEBUG */ _('Parsing auth token')
      this.parseAuthToken(req)
      /* DEBUG */ _('Finished parsing auth token')

      if (this.requireAuth && !this.testACL(req, '')) {
        /* DEBUG */ _('Failed auth check. Auth required for all routes')
        return this.json(
          res,
          {
            errors: 'You must be logged in for this',
          },
          403
        )
      }

      const docData = req.body as Record<string, any>

      const { id = '' } = req.params as { id?: string }

      const errors: string[] = []

      if (!id || id === '') {
        /* DEBUG */ _('No ID passed in parameters, returning error')
        return this.json(
          res,
          {
            error: 'ID not specified',
          },
          400
        )
      }

      if (!docData) {
        /* DEBUG */ _('No doc provided in body, returning error')
        return this.json(res, { error: 'No valid document body provided' }, 400)
      }

      /* DEBUG */ _('Finding document in collection')
      const doc = collection.id(id)

      /**
       * If there's no document, return an error for the request
       */
      if (!doc) {
        /* DEBUG */ _(
          'Document not found for ID "%s", returning errors array',
          id
        )
        errors.push('Document not found for that ID')
        return this.json(res, {
          errors,
        })
      }


      const dataKeys = Object.keys(docData)
      /**
       * Set the document keys to the specified data from the body of the request
       */
      /* DEBUG */ _('Setting document data')
      dataKeys.forEach(key => doc.set(key, docData[key]))
      /* DEBUG */ _('Finished setting %d keys', dataKeys.length)

      /**
       * Populate the document so as to remove keys, user must pass in a
       * populate query to see the results of the .set() operation
       */
      /* DEBUG */ _('Populating document with MemsPL query')
      const {
        slice: [populated],
        populateFilterUnspecified,
        populateQuery,
        errors: populateErrors,
      } = this.memsdbPopulate(_, req, collection, [doc])
      /* DEBUG */ _('Finished populating documents')

      /**
       * Construct the response object to contain the population details as
       * any errors that occurred
       */
      const responseObj: {
        doc: DBDoc<any>
        totalTime?: number
        errors: string[]
        populateFilterUnspecified: boolean
        populateQuery: string
      } = {
        doc: populated,
        errors: [...populateErrors],
        populateFilterUnspecified,
        populateQuery,
      }

      /**
       * Add totalTime parameter if this is debug
       */
      if (process.env.DEBUG) {
        responseObj.totalTime = Date.now() - start
      }

      return this.json(res, responseObj)
    })
    /* DEBUG */ _reg(
      'Registered path "%s"',
      `/collection/${collection.name}/set/:id`
    )

    // Register setData route for changing the entire documents data field
    this.app.patch(`/collection/${collection.name}/setRoot/:id`, (req, res) => {
      const _ = _reg.extend('<path>/setData/:id')
      const start = Date.now()

      /* DEBUG */ _('Parsing auth token')
      this.parseAuthToken(req)
      /* DEBUG */ _('Finished parsing auth token')

      if (this.requireAuth && !this.testACL(req, '')) {
        /* DEBUG */ _('Failed auth check. Auth required for all routes')
        return this.json(
          res,
          {
            errors: 'You must be logged in for this',
          },
          403
        )
      }

      const { data: docData } = req.body as {
        data: Record<string, any>
      }

      const { id = '' } = req.params as { id?: string }

      const errors: string[] = []

      if (!id || id === '') {
        /* DEBUG */ _('No ID passed in parameters, returning error')
        return this.json(
          res,
          {
            error: 'ID not specified',
          },
          400
        )
      }

      if (!docData) {
        /* DEBUG */ _('No doc provided in body, returning error')
        return this.json(res, { error: 'No valid document body provided' }, 400)
      }

      /* DEBUG */ _('Finding document in collection')
      const doc = collection.id(id)

      /**
       * If there's no document, return an error for the request
       */
      if (!doc) {
        /* DEBUG */ _(
          'Document not found for ID "%s", returning errors array',
          id
        )
        errors.push('Document not found for that ID')
        return this.json(res, {
          errors,
        })
      }

      /**
       * Set the document key to the specified data from the body of the request
       */
      /* DEBUG */ _('Setting document data')
      doc.setData(docData)

      /**
       * Populate the document so as to remove keys, user must pass in a
       * populate query to see the results of the .set() operation
       */
      /* DEBUG */ _('Populating document with MemsPL query')
      const {
        slice: [populated],
        populateFilterUnspecified,
        populateQuery,
        errors: populateErrors,
      } = this.memsdbPopulate(_, req, collection, [doc])
      /* DEBUG */ _('Finished populating documents')

      /**
       * Construct the response object to contain the population details as
       * any errors that occurred
       */
      const responseObj: {
        doc: DBDoc<any>
        totalTime?: number
        errors: string[]
        populateFilterUnspecified: boolean
        populateQuery: string
      } = {
        doc: populated,
        errors: [...populateErrors],
        populateFilterUnspecified,
        populateQuery,
      }

      /**
       * Add totalTime parameter if this is debug
       */
      if (process.env.DEBUG) {
        responseObj.totalTime = Date.now() - start
      }

      return this.json(res, responseObj)
    })
    /* DEBUG */ _reg(
      'Registered path "%s"',
      `/collection/${collection.name}/setData/:id`
    )

    // Register document delete route
    this.app.delete(`/collection/${collection.name}/delete/:id`, (req, res) => {
      const _ = _reg.extend('<path>/delete/:id')
      const start = Date.now()

      /* DEBUG */ _('Parsing auth token')
      this.parseAuthToken(req)
      /* DEBUG */ _('Finished parsing auth token')

      if (this.requireAuth && !this.testACL(req, '')) {
        /* DEBUG */ _('Failed auth check. Auth required for all routes')
        return this.json(
          res,
          {
            errors: 'You must be logged in for this',
          },
          403
        )
      }

      const { id = '' } = req.params as { id?: string }

      const errors: string[] = []

      if (!id || id === '') {
        /* DEBUG */ _('No ID passed in parameters, returning error')
        return this.json(
          res,
          {
            error: 'ID not specified',
          },
          400
        )
      }

      /* DEBUG */ _('Finding document in collection')
      const doc = collection.id(id)

      /**
       * If there's no document, return an error for the request
       */
      if (!doc) {
        /* DEBUG */ _(
          'Document not found for ID "%s", returning errors array',
          id
        )
        errors.push('Document not found for that ID')
        return this.json(
          res,
          {
            errors,
          },
          200
        )
      }

      /**
       * Delete the document in question
       */
      /* DEBUG */ _('Deleting document')
      doc.delete()

      /**
       * Construct the response object to contain the population details as
       * any errors that occurred
       */
      const responseObj: {
        totalTime?: number
      } = {}

      /**
       * Add totalTime parameter if this is debug
       */
      if (process.env.DEBUG) {
        responseObj.totalTime = Date.now() - start
      }

      return this.json(res, responseObj)
    })
    /* DEBUG */ _reg(
      'Registered path "%s"',
      `/collection/${collection.name}/delete/:id`
    )
  }

  private registerAuthRoutes() {
    const _reg = this._.extend('/auth')

    this.app.post('/auth/login', (req, res) => {
      const _ = _reg.extend('/login')

      const start = Date.now()
      /* DEBUG */ _('Creating auth token')
      const [token, errors] = this.createAuthToken(req)

      const responseObj: {
        errors?: string[]
        token?: string
        totalTime?: number
      } = {}
      let status = 200

      if (errors) {
        /* DEBUG */ _(
          'Errors encountered creating auth token, changing status and adding errors to response obj'
        )
        status = 400
        responseObj.errors = errors
      } else if (token) {
        /* DEBUG */ _('Setting token to response obj')
        responseObj.token = token
      }

      if (process.env.DEBUG) {
        responseObj.totalTime = Date.now() - start
      }

      /* DEBUG */ _('Returning response obj')
      return this.json(res, responseObj, status)
    })
  }

  /**
   * Populate a tree of docs with a MemsPL population string
   * @param _debug Debugger parent function
   * @param collection Collection the parent documents are from
   * @param docs Docs slice to apply population to
   * @param populationQuery MemsPL population query to run
   * @param filterPopulatedData Boolean of whether or not to filter unspecified keys
   * @returns populated docs slice
   * @ignore
   */
  private memsdbPopulate(
    _debug: Debugger,
    req: ExtendedRequest,
    collection: DBCollection<any>,
    docs: DBDoc<any>[]
  ): {
    slice: DBDoc<any>[]
    populateQuery: string
    populateFilterUnspecified: boolean
    status: number
    errors: string[]
  } {
    const _ = _debug.extend('OffsetAndLimit')

    const { populateQuery = '', populateFilterUnspecified = 'true' } =
      req.query as {
        populateQuery?: string
        populateFilterUnspecified?: string
      }

    const filter = populateFilterUnspecified === 'true' ? true : false
    if (!this.testACL(req, 'doc/populate'))
      return {
        slice: docs,
        populateQuery,
        populateFilterUnspecified: filter,
        status: 200,
        errors: ['Populate not authorised'],
      }

    if (populateQuery !== '') {
      /* DEBUG */ _('Populating slice of documents with specified MemsPL query')

      const slice = populate(collection, docs, populateQuery, filter)
      /* DEBUG */ _('Finished populating slice of documents')

      return {
        slice,
        populateQuery,
        populateFilterUnspecified: filter,
        status: 200,
        errors: [],
      }
    }

    /* DEBUG */ _('No MemsPL query specified')
    return {
      slice: docs,
      populateQuery,
      populateFilterUnspecified: filter,
      status: 200,
      errors: [],
    }
  }

  /**
   * Apply a limit and offset to an array of documents
   * @param _debug Debugger parent function
   * @param docs Docs array to slice
   * @param limitStr Limit string to parse
   * @param offsetStr Offset string to parse
   * @returns Slice of documents
   */
  private memsdbLimitOffset(
    _debug: Debugger,
    req: ExtendedRequest,
    docs: DBDoc<any>[]
  ) {
    const _ = _debug.extend('limitOffset')
    let errors = []

    const {
      limit: limitStr = '25',
      offset: offsetStr = '0',
      sort: sortStr,
    } = req.query as {
      limit: string
      offset: string
      sort: string
    }

    /* DEBUG */ _('Parsing limit and offset')
    const parsedLimit = Number.parseInt(limitStr)
    const parsedOffset = Number.parseInt(offsetStr)

    const limitIsNan = Number.isNaN(parsedLimit)
    const limitLTOne = !limitIsNan ? parsedLimit < 1 : false
    const limitGTTwoFifty = !limitIsNan ? parsedLimit > 250 : false

    const offsetIsNan = Number.isNaN(parsedOffset)
    const offsetLTZero = !offsetIsNan ? parsedOffset < 0 : false

    /* DEBUG */ _('Validating and clamping limit and offset')
    const limit = limitIsNan || limitLTOne || limitGTTwoFifty ? 25 : parsedLimit
    const offset = offsetIsNan || offsetLTZero ? 0 : parsedOffset

    try {
      const sort = JSON.parse(sortStr)
  
      Array.isArray(sort) &&
        sort.forEach(obj => {
          const { key, sort = 'DESC' } = obj as {
            key: string
            sort: 'DESC' | 'ASC'
          }
  
          docs.sort((a, b) => {
            let aVal, bVal
            switch (key) {
              case 'id':
              case '_createdAt':
              case '_updatedAt':
                aVal = a[key]
                bVal = b[key]
                break
              default:
                aVal = a.data[key]
                bVal = b.data[key]
                break
            }
  
            return sort === 'DESC' ? (aVal < bVal ? 1 : -1) : aVal > bVal ? 1 : -1
          })
        })
    } catch (err) {
      errors.push('Failed to parse sort array')
    }

    limitIsNan && errors.push('Limit is not a number')
    limitLTOne && errors.push('Limit less than 1')
    limitGTTwoFifty && errors.push('Limit greater than 250')
    offsetIsNan && errors.push('Offset is not a number')
    offsetLTZero && errors.push('Offset less than 0')

    /* DEBUG */ _('Returning slice')
    return {
      /** Slice of documents */
      slice: docs.slice(offset, offset + limit),
      /** Offset from index 0 */
      offset,
      /** How many documents are being returned at a time */
      limit,
      /** How many documents there are in total */
      total: docs.length,
      /** Errors from the process */
      errors,
      /** Response status */
      status: 200,
    }
  }

  private memsdbFind(
    _debug: Debugger,
    req: ExtendedRequest,
    collection: DBCollection<any>
  ) {
    const _ = _debug.extend('find')

    const { query: queryString = '[{}]' } = req.query as {
      query: string
    }

    let parsedQuery = []

    try {
      parsedQuery = JSON.parse(
        JSON.stringify(JSON.parse(queryString), [
          'key',
          'inverse',
          'operation',
          'comparison',
          'reactiveQuery',
        ])
      )
    } catch (err) {
      _('Invalid query entered, returning no documents')
      return {
        slice: [],
        total: collection.docs.length,
        errors: ['Invalid query'],
        query: queryString,
        status: 400,
      }
    }


    /* DEBUG */ _('Retrieving specified slice from collection')
    const queries = []

    if (parsedQuery) {
        if (Array.isArray(parsedQuery)) queries.push(...parsedQuery)
        else queries.push(parsedQuery)
    }

    const filtered = collection.find({
      queries,
    })

    return {
      slice: filtered,
      total: filtered.length,
      status: 200,
      errors: [],
      query: JSON.stringify(queries),
    }
  }

  private json(res: Response, body: any, status: number = 200) {
    res.status(status).json(JSON.stringify(body))
  }

  private parseAuthToken(req: ExtendedRequest) {
    const _ = this._.extend('parseAuthToken')
    const { authorization: AuthHeader } = req.headers

    if (!AuthHeader) return []

    const AuthToken = AuthHeader.substring(7)

    try {
      const token = verify(AuthToken, this.secret, {
        audience: this.db.name,
        complete: true,
      }) as Jwt

      req.auth = token.payload as {
        authId: string
        acl: string[]
        type: string
      }
    } catch (error) {
      _('Failed to verify token, %O', error)
    }
  }

  private createAuthToken(
    req: Request
  ): [token: string, errors: null] | [token: null, errors: string[]] {
    const _ = this._.extend('createAuthToken')

    const {
      type: authType = 'password',
      username: authName,
      key: authKey,
      id: authId,
    } = req.body as {
      type?: 'password' | 'api'
      username?: string
      key?: string
      id?: string
    }

    const authCol = this.db.collection(
      '<plugin:http>auth'
    ) as DBCollection<Auth>
    const tokensCol = this.db.collection(
      '<plugin:http>tokens'
    ) as DBCollection<Token>
    const errors = []

    if (!authKey) {
      /* DEBUG */ _('No key provided, adding error')
      errors.push('"key" not provided')
    }

    if (authType === 'password' && !authName) {
      /* DEBUG */ _('Password login and no name provided, adding error')
      errors.push('"username" not provided')
    }
    if (authType === 'api' && !authId) {
      /* DEBUG */ _('API login and no ID provided, adding error')
      errors.push('"id" not provided')
    }

    if (errors.length > 0) {
      /* DEBUG */ _('Errors array has 1 or more errors, returning them')
      return [null, errors]
    }

    /* DEBUG */ _('Building query for finding the auth account')
    let query = QueryBuilder.where('type', '===', authType)

    if (authType === 'api') {
      /* DEBUG */ _('API login, adding ID query')
      query.where('id', '===', authId)
    } else {
      /* DEBUG */ _('Password login, adding name query')
      query.where('username', '===', authName)
    }

    /**
     * Find the specified auth
     */
    /* DEBUG */ _('Searching auth account')
    const [authAccount] = authCol.find(query)
    /* DEBUG */ _('Finished searching for auth account')

    /**
     * Make sure the auth account exists
     */
    if (!authAccount) {
      /* DEBUG */ _('No auth account found, returning error')
      return [null, ['Invalid Name or Key']]
    }

    /**
     * Verify the key against what's stored in the DB
     */
    /* DEBUG */ _('Verifying password against hash')
    if (
      MemsDBServer.saltHashString(authKey as string, authAccount.data.salt) !==
      authAccount.data.hash
    ) {
      /* DEBUG */ _("Hash doesn't match what's stored, returning error")
      return [null, ['Invalid Name or Key']]
    }
    /* DEBUG */ _('Finished verifying password')

    /**
     * Start constructing JWT
     */
    const jwtObj: {
      type: string
      authId: string
      acl: string[]
      allowedTokens?: number
      existingTokens?: number
    } = {
      type: authType,
      authId: authAccount.id,
      acl: authAccount.data.acl,
    }

    /**
     * Make sure api accounts don't have too many active tokens
     */
    /* DEBUG */ _('Checking if api')
    let existingTokens: DBDoc<any>[]
    if (authType === 'api' && authAccount.data.username !== 'root') {
      /* DEBUG */ _(
        'API account and non root account, making sure account still has usable token slots'
      )
      /**
       * Query for unexpired tokens
       */
      /* DEBUG */ _('Finding unexpired tokens')
      existingTokens = tokensCol.find(
        new QueryBuilder()
          .where('for', '===', authAccount.id)
          .where('expiry', '>', Date.now() + this.tokenExpiry * 1000)
          .where('valid', '===', true)
      )

      const existingCount = existingTokens.length
      /* DEBUG */ _(
        'Finished finding unexpired tokens, %d found',
        existingCount
      )

      /**
       * Ensure API account doesn't exceed this amount
       */
      if (existingCount >= authAccount.data.allowedTokens) {
        /* DEBUG */ _('Allowed tokens exhausted, returning error')
        return [
          null,
          [
            'Maximum number of tokens reached. Please wait for one to expire, apply to the webmaster for an increase, or deactivate one via the API',
          ],
        ]
      }

      jwtObj.allowedTokens = authAccount.data.allowedTokens
      jwtObj.existingTokens = existingCount
    }
    /* DEBUG */ _('Finished checking if api')

    /* DEBUG */ _('Signing JWT')
    const jwt = sign(jwtObj, this.secret, {
      expiresIn: this.tokenExpiry,
      audience: this.db.name,
    })
    /* DEBUG */ _('Finished signing JWT')

    /* DEBUG */ _('Inserting token into DB')
    tokensCol.insert({
      doc: {
        expiry: Date.now() + this.tokenExpiry * 1000,
        for: authAccount.id,
        token: jwt,
        valid: true,
      },
    })
    /* DEBUG */ _('Finished inserting token in DB')

    /* DEBUG */ _('Returning JWT')
    return [jwt, null]
  }

  private static saltHashString(str: string, salt: string): string {
    const hash = pbkdf2Sync(
      str,
      salt,
      MemsDBServer.keyIterations,
      MemsDBServer.keyLength,
      'sha512'
    )
    return hash.toString('base64')
  }

  private testACL(req: ExtendedRequest, required: string) {
    const { auth } = req

    if (auth && (auth.acl.includes('*/*') || auth.acl.includes(required)))
      return true

    return false
  }
}
