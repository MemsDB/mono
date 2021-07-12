# MemsDB Populate

The main export of this module would have to be the `populate` function. This function allows you to pass in an array of documents from a single collection (from a query for example) and to populate a tree of documents based on the provided population query. A simple language was written for this purpose, somewhat paralleling GraphQL and plain JSON, it's called the MemsDB Population Language (`MemsPL` for short). Documents (and sub-documents) returned by the `populate` function are duplicates of the original to prevent undesired mutations.

The population function can also be used to filter out keys on documents and deeply nested document if they're not needed. The `filter` parameter dictates whether or not to delete the non-selected keys on the duped documents.

## MemsPL

As mentioned, MemsPL is quite similar to GraphQL and JSON. The full supported syntax includes:

- `<referenceCollection>` Where `refferenceCollection` is the name of a collection on the DB
- `(localKey:remoteKey)` Where `localKey` is what to use as a comparison on the parent document, and `remoteKey` is what to compare it against on the target documents
- `key` - Where key is the key you want to populate. The target documents will compare their ID's against the parent provided `key`.
  If a key doesn't exist when you're populating, it will be created.
  Some characters aren't allowed in a key. They include:
  - `{`,
  - `}`,
  - `[`,
  - `]`,
  - `(` (Closing parenthesis are allowed provided they're not in a local/remoteKey declaration),
  - `<`,
  - `>`,
  - `,`,
  - `\n`,
  - `:` (Is allowed so long as it's not directly after a `(`.)
- `[key, key, ...]` - Will populate an array of objects where the ID matches an ID in the parent `key` array
- `{key, key, ...}` - Will populate a lone document, replacing the parent `key` field with the document that matches the ID in said field

So the following combinations are valid:

```
<!-- Standard format with custom key to populate to -->
<users>(author:username)populatedUserField{
  username
}
<!-- Flipped reference and local/remote declaration with custom key to populate to -->
(author:username)<users>populatedUserField{
  username
}
<!-- Reference, What key on parent to compare against, custom key to populate to -->
<users>(author)populatedUserField{
  username
}
<!-- Reference, Compare documents against parent author field, replace the author field with result -->
<users>(:username)author{
  username
}
<!-- Reference, compare the remote author field against the ID on the parent document, output an array with only the content field (and core fields) on them -->
<submissions>(id:author)submissions[
  content
]
<!-- With filtering enabled, the above would all only have the declared fields on them -->
<!-- Without filtering enabled, the same could be acomplished like this: -->
<users>(author:username)populatedUserField

(author:username)<users>populatedUserField

<users>(author)populatedUserField

<users>(:username)author

<submissions>(id:author)submissions

<!-- More are compatible, try experimenting! -->
```

If you for example have an array of comments, and you want to populate the user to each comment, you'd use a query somewhat like this:

```
user{
  username
}
```

Comments after each property are optional, and quotation marks aren't needed/advised against in keys.
Following the examples from above. If you have a user with an array of comments they've posted (referenced by an id) and you want to retrieve the `content` and the `likes` fields, while not having to put ID references to each comment on the user document, you'd have something like this:

```
<!-- On the user doc/s -->
<comments>(:author)comments[
  content
  likes
]
```

Additionally, if you had an array of submissions where you wanted to populate the user on each submission, as well as the comments on those submissions, and the user who wrote each comment, you'd use something similar to this:
```json
// Data structures
// users:
{
  "username": "string"
}
// submissions:
{
  "user": "userID/string",
  "comments": ["commentID/string"]
}
// comments:
{
  "content": "string",
  "likes": "number",
  "user": "userID/string"
}
```
```
<users>user{
  username
}
<comments>comments[
  content
  likes
  user{
    username
  }
]
```

## Document Caveats

A document's original reference key (e.g `parent`, `children`, etc.) will get replaced with the populated document/s - that being said, you can assign the population to a new field if you provide at least a localKey reference from the local/externalKey syntax. For a document that is more than just 1 dimensional and has objects deeper in it (e.g `{content: {reference: 'f75b8d8b-a28f-4c94-b560-f9931f6dc5e8'}}`), a new key will be created that's a period delimited version of how to get to the desired key (e.g `content.reference`).

## Examples

Given you have a set of collections like the following:

```typescript
const submissionsCol = new DBCollection(db, {
  name: 'submissions',
  structure: {
    title: '',
    comments: [''],
    user: '',
  },
})

const commentsCol = new DBCollection(db, {
  name: 'comments',
  structure: {
    content: '',
    user: '',
    parent: '',
  },
})

const usersCol = new DBCollection(db, {
  name: 'users',
  structure: {
    content: {
      comments: [''],
      submissions: [''],
    },
    name: '',
  },
})
```

And starting from the `users` collection, you want the results to look something like this:

```json
[
  // User documents
  {
    "content.comments": [
      // Array of comment documents
      {
        "parent": {
          // Parent of this comment, not an explicit reference by default, just an ID
          "user": {
            // User document populated in
            "name": "Finn_Kunde77",
            "id": "b512ae9a-20c0-4f8c-ad23-2235b7a99239",
            "_type": "(DBCollection<users<DBDoc>>)",
            "_indexes": []
          },
          "id": "7a1fdbcc-89a2-4276-8888-1d60ca14acb6",
          "_type": "(DBCollection<submissions<DBDoc>>)",
          "_indexes": []
        },
        "id": "ea810f01-88d4-481c-859d-cbb2e1408df4",
        "_type": "(DBCollection<comments<DBDoc>>)",
        "_indexes": []
      }
    ],
    "id": "b512ae9a-20c0-4f8c-ad23-2235b7a99239",
    "_type": "(DBCollection<users<DBDoc>>)",
    "_indexes": []
  }
]
```

Then running the query something like this may be desired:

```javascript
const data = populate(
  usersCol, // Reference to the collection used in the search
  [usersCol.docs[0]], // Results of a query, using the first user as an example
  `
    <comments>content.comments[
      <submissions>parent{
        <users>user{
          name
        }
      }
    ]
  `, // Query to populate the following keys: user, comments[], comments[].user, comments[].user.submissions[]
  true // Filter out unspecified keys
)
```

If you don't want the result keys to be truncated, then you'd simply flip the true at the end to a false, which would give you the following results (with the same comments for reference):

```json
[
  // User documents
  {
    "content": {
      "comments": ["52105702-46c5-4b82-b06d-2bcf46bbf87d"],
      "submissions": ["1c650375-3675-4d0d-a293-20808887817c"]
    },
    "name": "Lucy44",
    "_createdAt": 1609853187136,
    "_updatedAt": 1609853187140,
    "content.comments": [
      // Array of comment documents
      {
        "content": "Dolor quo aut et ducimus dolores. Ea sit distinctio. Nihil illo quo enim est blanditiis natus repellendus non. Quaerat enim qui eveniet. Architecto nam voluptas iusto rerum dolor quasi voluptas necessitatibus.",
        "user": "3d27cbb6-8a10-42fc-9100-de452db28b28",
        "parent": {
          // Parent of this comment, not an explicit reference by default, just an ID
          "title": "Nesciunt sint optio autem occaecati.",
          "comments": ["52105702-46c5-4b82-b06d-2bcf46bbf87d"],
          "user": {
            // User document populated in
            "content": {
              "comments": ["52105702-46c5-4b82-b06d-2bcf46bbf87d"],
              "submissions": ["1c650375-3675-4d0d-a293-20808887817c"]
            },
            "name": "Lucy44",
            "_createdAt": 1609853187136,
            "_updatedAt": 1609853187140,
            "id": "3d27cbb6-8a10-42fc-9100-de452db28b28",
            "_type": "(DBCollection<users<DBDoc>>)",
            "_indexes": []
          },
          "_createdAt": 1609853187138,
          "_updatedAt": 1609853187140,
          "id": "1c650375-3675-4d0d-a293-20808887817c",
          "_type": "(DBCollection<submissions<DBDoc>>)",
          "_indexes": []
        },
        "_createdAt": 1609853187140,
        "_updatedAt": 1609853187140,
        "id": "52105702-46c5-4b82-b06d-2bcf46bbf87d",
        "_type": "(DBCollection<comments<DBDoc>>)",
        "_indexes": []
      }
    ],
    "id": "3d27cbb6-8a10-42fc-9100-de452db28b28",
    "_type": "(DBCollection<users<DBDoc>>)",
    "_indexes": []
  }
]
```

In the above, you can also see the original `content: {comments}` arrays, as well as where it was populated to (`content.comments`) due to the afformentioned [caveats](#document-caveats)

If any of the above is unclear. Feel free to drop an issue in the [@memsdb/mono](https://github.com/MemsDB/mono) github