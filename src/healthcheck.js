'use strict'

const fs = require('fs')

try {
  const modified = fs.statSync('/tmp/orbysync-simulator.heartbeat').mtimeMs
  process.exit(Date.now() - modified < 30_000 ? 0 : 1)
} catch {
  process.exit(1)
}
