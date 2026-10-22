// Runs the API in watch mode for `npm run dev`.
// tsx watch stalls at startup when its stdin is a pipe that never closes — which is
// what concurrently hands its children on Windows — so start it with stdin ignored.
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const tsx = fileURLToPath(import.meta.resolve('tsx/cli'))
const child = spawn(process.execPath, [tsx, 'watch', '--clear-screen=false', '--include', 'server/src', 'server/src/index.ts'], {
  stdio: ['ignore', 'inherit', 'inherit'],
})
child.on('exit', code => process.exit(code ?? 0))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
