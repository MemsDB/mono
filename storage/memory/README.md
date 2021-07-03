A storage engine for [MemsDB](https://github.com/brocococonut/@memsdb). This engine will store the data for a document in memory. This is the default backup engine for MemsDB.

Data will be specifically set to `doc.pluginData.memoryStorage` using the built in plugin data functions. The data can be retrieved via `doc.data`

```ts
import { DB } from '@memsdb/core'
import { MemoryStorage } from '@memsdb/storage-memory'

const db = new DB('test', {
  backupProvider: new MemoryStorage(),
})
```