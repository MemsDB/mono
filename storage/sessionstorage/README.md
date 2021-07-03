A storage engine for [MemsDB](https://github.com/brocococonut/@memsdb). This engine will store the data for a document in the browsers sessionStorage. Each document will be a seperate entry in sessionStorage where the ID of the document is the key.

The data can be retrieved via `doc.data`

```ts
import { DB } from '@memsdb/core'
import { SessionStorage } from '@memsdb/storage-session'

const db = new DB('test', {
  backupProvider: new SessionStorage(),
})
```