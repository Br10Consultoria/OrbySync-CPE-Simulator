'use strict'

const fs = require('fs')
const path = require('path')

const directory = path.resolve(__dirname, '../profiles')
const files = fs.readdirSync(directory).filter((name) => name.endsWith('.json'))
if (!files.length) throw new Error('Nenhum perfil JSON encontrado.')
for (const file of files) {
  const profile = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'))
  for (const key of ['DeviceID.Manufacturer', 'DeviceID.OUI', 'DeviceID.ProductClass']) {
    if (!Array.isArray(profile[key])) throw new Error(`${file}: parametro obrigatorio ausente: ${key}`)
  }
  console.log(`${file}: OK (${Object.keys(profile).length} parametros)`)
}

