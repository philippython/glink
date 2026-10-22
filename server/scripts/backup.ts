// Consistent online backup of the SQLite database (safe while the app is running).
// Usage: npm run backup            → writes to BACKUP_DIR (default server/data/backups)
// Uploaded videos live in UPLOAD_DIR; back that folder up with your usual file sync (rsync, restic, a bucket).
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { config } from '../src/config.ts'

const dir = path.resolve(process.env.BACKUP_DIR ?? path.join(path.dirname(config.dbPath), 'backups'))
fs.mkdirSync(dir, { recursive: true })
const file = path.join(dir, `glink-${new Date().toISOString().replace(/[:.]/g, '-')}.db`)
const db = new DatabaseSync(config.dbPath, { readOnly: true })
db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`)
db.close()

// Keep the newest 14 backups.
const keep = Number(process.env.BACKUP_KEEP ?? 14)
const old = fs.readdirSync(dir).filter(f => /^glink-.*\.db$/.test(f)).sort().reverse().slice(keep)
for (const f of old) fs.rmSync(path.join(dir, f))
console.log(`Backup written: ${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`)
