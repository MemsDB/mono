A storage engine for [MemsDB](https://github.com/brocococonut/@memsdb). This engine will store the data for a document in the browsers localStorage. Each document will be a seperate entry in localStorage where the ID of the document is the key.

The data can be retrieved via `doc.data`

```ts
import { DB } from '@memsdb/core'
import { LocalStorage } from '@memsdb/storage-localstorage'

const db = new DB('test', {
  backupProvider: new LocalStorage(),
})
```