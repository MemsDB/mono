A backup engine for [MemsDB](https://github.com/brocococonut/@memsdb). This engine will backup to the filesystem

```ts
import { DB } from '@memsdb/core'
import { FSBackup } from '@memsdb/backup-fs'

const db = new DB('test', {
    backupProvider: new FSBackup({
      saveDirectory: './',                  // default value
      filenameFormat: '%time_%date.memsdb', // default value. Use %date and %time to add formatting to your filename
      backupLimit: 10                       // default value
    }),
})
```