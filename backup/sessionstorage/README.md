A backup engine for [MemsDB](https://github.com/brocococonut/@memsdb). This engine will backup to the browser's sessionStorage

```ts
import { DB } from '@memsdb/core'
import { SessionStorageBackup } from '@memsdb/backup-sessionstorage'

const db = new DB('test', {
  backupProvider: new SessionStorageBackup(),
})
```