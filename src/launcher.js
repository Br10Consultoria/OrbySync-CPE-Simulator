'use strict'

const { fork } = require('child_process')
const fs = require('fs')
const path = require('path')

const profiles = [
  { name: 'zte', countVar: 'ZTE_COUNT', prefix: 'SIMZTE' },
  { name: 'vsol', countVar: 'VSOL_COUNT', prefix: 'SIMVSOL' },
  { name: 'datacom', countVar: 'DATACOM_COUNT', prefix: 'SIMDACM' },
  { name: 'huawei', countVar: 'HUAWEI_COUNT', prefix: 'SIMHW' },
]

function fail(message) {
  console.error(`[OrbySync Simulator] ERRO: ${message}`)
  process.exit(1)
}

if (String(process.env.SIMULATOR_ENABLED).toLowerCase() !== 'true') {
  fail('SIMULATOR_ENABLED precisa ser true para iniciar.')
}

let acs
try { acs = new URL(process.env.ACS_URL || '') } catch { fail('ACS_URL invalida.') }
const allowedHost = String(process.env.ALLOWED_ACS_HOST || '').trim().toLowerCase()
if (!allowedHost || acs.hostname.toLowerCase() !== allowedHost) {
  fail(`ACS bloqueado. Host recebido: ${acs.hostname}; permitido: ${allowedHost || '(vazio)'}.`)
}
if (!['http:', 'https:'].includes(acs.protocol)) fail('ACS_URL deve usar HTTP ou HTTPS.')
if (!process.env.ACS_USERNAME || !process.env.ACS_PASSWORD) fail('ACS_USERNAME e ACS_PASSWORD sao obrigatorios.')

const interval = Math.max(100, Number(process.env.SPAWN_INTERVAL_MS || 1000))
const restartDelay = Math.max(10_000, Number(process.env.RESTART_DELAY_MS || 15_000))
const sessionRetryDelay = Math.max(35_000, Number(process.env.SESSION_RETRY_DELAY_MS || 45_000))
const children = new Map()
let spawnIndex = 0
const heartbeat = '/tmp/orbysync-simulator.heartbeat'
fs.writeFileSync(heartbeat, new Date().toISOString())
const heartbeatTimer = setInterval(() => fs.writeFileSync(heartbeat, new Date().toISOString()), 10_000)

function spawnDevice(profile, index) {
  const serial = `${profile.prefix}${String(index).padStart(6, '0')}`
  const profilePath = path.join('/app/profiles', `${profile.name}.json`)
  if (!fs.existsSync(profilePath)) fail(`Perfil ausente: ${profilePath}`)
  const child = fork('/app/src/worker.js', [], {
    env: { ...process.env, PROFILE_PATH: profilePath, SIM_SERIAL: serial, SIM_PROFILE: profile.name },
    stdio: 'inherit',
  })
  children.set(serial, child)
  console.log(`[OrbySync Simulator] ${serial} iniciado (${profile.name}).`)
  child.on('exit', (code, signal) => {
    children.delete(serial)
    if (shuttingDown) return
    const baseDelay = code === 75 ? sessionRetryDelay : restartDelay
    const jitter = (index % 11) * 1_000
    const delay = baseDelay + jitter
    console.error(`[OrbySync Simulator] ${serial} encerrou (${signal || code}); reiniciando em ${Math.round(delay / 1000)}s.`)
    setTimeout(() => spawnDevice(profile, index), delay)
  })
}

let total = 0
for (const profile of profiles) {
  const count = Math.min(250, Math.max(0, Number(process.env[profile.countVar] || 0)))
  total += count
  for (let index = 1; index <= count; index += 1) {
    setTimeout(() => spawnDevice(profile, index), spawnIndex * interval)
    spawnIndex += 1
  }
}
if (!total) fail('Configure pelo menos um perfil com quantidade maior que zero.')
console.log(`[OrbySync Simulator] Agendados ${total} dispositivos para ${acs.origin}.`)

let shuttingDown = false
function shutdown() {
  shuttingDown = true
  clearInterval(heartbeatTimer)
  for (const child of children.values()) child.kill('SIGTERM')
  setTimeout(() => process.exit(0), 1500)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
