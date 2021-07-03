A backup engine for [MemsDB](https://github.com/brocococonut/@memsdb). This engine will backup to the void - scrapping the backup entirely. This is the default backup engine for MemsDB

```ts
import { DB } from '@memsdb/core'
import { VoidBackup } from '@memsdb/backup-void'

const db = new DB('test', {
  backupProvider: new VoidBackup(),
})
```