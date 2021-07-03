A storage engine for [MemsDB](https://github.com/brocococonut/@memsdb). This engine will store the data for a document the filesystem. As each document is an individual file, it's recommended you only use this on filesystems that allow for many files in a single directory. As this is synchronous, it's also recommended you don't store large documents.

The data can be retrieved via `doc.data`

```ts
import { DB } from '@memsdb/core'
import { FSStorage } from '@memsdb/storage-fs'

const db = new DB('test', {
  backupProvider: new FSStorage({
    saveDirectory: './data',    // default value. Where to store the objects.
    prefix: `${this.db.name}_`  // default value. Any prefix will get prepended to the document ID for the filename
  }),
})
```