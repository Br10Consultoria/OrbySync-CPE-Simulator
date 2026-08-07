'use strict'

const fs = require('fs')
const simulator = require('/opt/genieacs-sim/simulator')

const profile = JSON.parse(fs.readFileSync(process.env.PROFILE_PATH, 'utf8'))
const serial = process.env.SIM_SERIAL
const acsUrl = process.env.ACS_URL

function setValue(parameter, value, type = 'xsd:string', writable = false) {
  profile[parameter] = [writable, value, type]
}

setValue('DeviceID.SerialNumber', serial)
setValue('InternetGatewayDevice.DeviceInfo.SerialNumber', serial)
setValue('InternetGatewayDevice.ManagementServer.Username', process.env.ACS_USERNAME)
setValue('InternetGatewayDevice.ManagementServer.Password', process.env.ACS_PASSWORD)
setValue('InternetGatewayDevice.DeviceInfo.ProvisioningCode', 'ORBYSYNC-LAB', 'xsd:string', true)
setValue('InternetGatewayDevice.X_ORBYSYNC_Simulator', true, 'xsd:boolean')

const suffix = Number(serial.match(/(\d+)$/)?.[1] || 1)
const rx = -16 - (suffix % 12) * 0.7
const tx = 2 + (suffix % 4) * 0.2
setValue('InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.RXPower', String(Math.round(rx * 100)), 'xsd:int')
setValue('InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig.TXPower', String(Math.round(tx * 100)), 'xsd:int')
setValue('InternetGatewayDevice.DeviceInfo.UpTime', String(3600 + suffix * 113), 'xsd:unsignedInt')

console.log(`[${serial}] conectando em ${new URL(acsUrl).origin}`)
simulator.start(profile, serial, acsUrl)
