A backup engine for [MemsDB](https://github.com/brocococonut/@memsdb). This engine will backup to the browser's localStorage

```ts
import { DB } from '@memsdb/core'
import { LocalStorageBackup } from '@memsdb/backup-localstorage'

const db = new DB('test', {
  backupProvider: new LocalStorageBackup(),
})
```