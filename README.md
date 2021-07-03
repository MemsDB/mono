# memsdb
A simple in memory DB - Created to experiment more with typescript and classes

![minified](https://badgen.net/bundlephobia/min/memsdb)
![minified + gzip](https://badgen.net/bundlephobia/minzip/memsdb)
![dependency count](https://badgen.net/bundlephobia/dependency-count/memsdb)
![tree shaking](https://badgen.net/bundlephobia/tree-shaking/memsdb)
[![Rate on Openbase](https://badges.openbase.io/js/rating/memsdb.svg)](https://openbase.io/js/memsdb?utm_source=embedded&utm_medium=badge&utm_campaign=rate-badge)

## Documentation:
- [Documentation Root](https://memsdb.github.io/mono/)
- [DB Class Docs](https://memsdb.github.io/mono/classes/_memsdb_core.db.html)
- [DBCollection Class Docs](https://memsdb.github.io/mono/classes/_memsdb_core.dbcollection.html)
- [DBDoc Class Docs](https://memsdb.github.io/mono/classes/_memsdb_core.dbdoc.html)
- [Query Builder Class Docs](https://memsdb.github.io/mono/classes/_memsdb_utils.querybuilder.html)
- [Population/MemsPL Docs](https://memsdb.github.io/mono/modules/_memsdb_utils.html#populate)

Initialising a new database:
```typescript
import { DB } from '@memsdb/core'

const db = new DB('My DB Name')
```

Creating and assigning new collections to the db:
```typescript
import { DBCollection } from '@memsdb/core'

const comments = new DBCollection(db, {
  name: 'comments',
  structure: {
    text: '',
    by: '',
    parent: '',
  },
})
```

Adding documents to an existing collection:
```typescript
comments.insertOne({
  text: `My fantastic comment`,
  by: 'me'
})
```

Finding documents in a collection:
```typescript
/**
 * Find all documents where the `by` field is equal to 'me'
 */
comments.find([{
  key: 'by',
  operation: '===',
  comparison: 'me'
}])
// Or with the QueryBuilder:
import { QueryBuilder } from '@memsdb/utils'

comments.find(QueryBuilder.where('by', '===', 'me'))

/**
 * Find a document by it's id
 */
comments.id('50d4047b-6c6d-47e8-b487-42ca2a7a4c00')
```

Full example:
```typescript
import { DB, DBCollection } from '@memsdb/core'
import { QueryBuilder } from '@memsdb/utils'

const db = new DB('My DB Name')

const comments = new DBCollection(db, {
  name: 'comments',
  structure: {
    text: '',
    by: '',
    parent: '',
  },
})

comments.insertOne({
  text: `My fantastic comment`,
  by: 'me'
})

const docs = comments.find([{
  key: 'by',
  operation: '===',
  comparison: 'me'
}])
// Or with the QueryBuilder:
const docs = comments.find(QueryBuilder.where('by', '===', 'me'))

// docs should contain the one comment we added
```

The query language is still rather simple but can support the operators: `<` | `>` | `<=` | `>=` | `===` | `||` | `includes` | `isContainedIn` | `hasAllOf` | `all>than` | `all<than` | `all>=to` | `all<=to` | `all===to` | `some>than` | `some<than` | `some>=to` | `some<=to` | `some===to` - where `||` runs an OR using an array of `Query` objects (supports multi-level ORing).
Additionally, you can use the length of an array as the "key" to compare values against.
If you for example had the following document: 
```json
{
  "friends": [
    // ...
  ]
}
```
You would be able to query against the length of that array like so:
```ts
users.find(QueryBuilder.where('friends.length', '===', 0))
```

An example query object of:
```typescript
const query = {
  key: 'by',
  operation: '===',
  comparison: 'me'
}
// Or with the QueryBuilder:
import { QueryBuilder } from '@memsdb/utils'

const query = QueryBuilder.where('by', '===', 'me')
```
should be read as `document.data.by (key to get value of) '===' 'me' (value)`

The `some===to` key (`some*`, `all*`) can be used to find similarities between different arrays

`all===to` makes sure that all of the specified key is equal to the comparison. This would usually be useful with query keys that specify an array  with objects in it like the following: `folder.children.[].exists`. In the previous example you'd use `all===to` to make sure that all child folders of the first level have the property `exists` and that it's equal to whatever comparison value you set in the query. Eg.:
```typescript
const query = {
  key: 'folder.children.[].exists',
  operation: 'all===to',
  comparison: true
}
// OR using the query builder:
import { QueryBuilder } from '@memsdb/utils'

const query = QueryBuilder
  .where('folder.children.[].exists', 'all===to', true)
```

Other functions on the database, collections, and documents can be read in the [documentation](https://memsdb.github.io/mono/)
