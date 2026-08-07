'use strict'

function put(profile, parameter, value, type = 'xsd:string', writable = false) {
  profile[parameter] = [writable, value, type]
}

function numericSuffix(serial) {
  return Number(String(serial).match(/(\d+)$/)?.[1] || 1)
}

function installDynamicTelemetry(profile, serial, intervalMs = 30_000) {
  const seed = numericSuffix(serial)
  const profileName = String(process.env.SIM_PROFILE || 'cpe').toUpperCase()
  let tick = 0
  let received = 80_000_000 + seed * 1_300_000
  let sent = 12_000_000 + seed * 320_000

  const pon = 'InternetGatewayDevice.WANDevice.1.X_GponInterfaceConfig'
  const wan = 'InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig'
  const pppStats = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Stats'
  const wlan2g = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1'
  const wlan5g = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5'

  put(profile, `${wan}.PhysicalLinkStatus`, 'Up')
  put(profile, `${wlan5g}.SSID`, `OrbySync-Lab-${profileName}-5G`, 'xsd:string', true)
  put(profile, `${wlan5g}.Enable`, true, 'xsd:boolean', true)
  put(profile, `${wlan5g}.Channel`, '36', 'xsd:unsignedInt', true)
  put(profile, `${wlan5g}.TotalAssociations`, '1', 'xsd:unsignedInt')
  put(profile, `${wlan5g}.AssociatedDevice.1.AssociatedDeviceMACAddress`, `02:55:00:00:${String(seed % 100).padStart(2, '0')}:01`)
  put(profile, `${wlan5g}.AssociatedDevice.1.AssociatedDeviceIPAddress`, `192.168.5.${20 + (seed % 200)}`)
  put(profile, `${wlan5g}.AssociatedDevice.1.AssociatedDeviceRssi`, '-50', 'xsd:int')

  for (let port = 1; port <= 4; port += 1) {
    const lan = `InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.${port}`
    put(profile, `${lan}.Enable`, true, 'xsd:boolean', true)
    put(profile, `${lan}.Name`, `LAN${port}`)
    put(profile, `${lan}.MaxBitRate`, port <= 2 ? '1000' : '100', 'xsd:unsignedInt')
    put(profile, `${lan}.DuplexMode`, 'Full')
    put(profile, `${lan}.MACAddress`, `02:EE:${String(seed % 100).padStart(2, '0')}:00:00:0${port}`)
  }

  function update() {
    tick += 1
    const wave = Math.sin((tick + seed) / 3)
    const rx = -17.5 - (seed % 9) * 0.75 + wave * 1.8
    const tx = 2.1 + (seed % 4) * 0.18 + Math.cos((tick + seed) / 4) * 0.25
    const temperature = 40 + (seed % 7) + Math.sin((tick + seed) / 5) * 3
    const voltage = 3300 + Math.round(Math.sin((tick + seed) / 4) * 45)
    const bias = 8 + (seed % 5) + Math.sin((tick + seed) / 6)
    const downIncrement = 600_000 + ((seed * 97 + tick * 131) % 2_400_000)
    const upIncrement = 120_000 + ((seed * 53 + tick * 71) % 650_000)
    received += downIncrement
    sent += upIncrement

    put(profile, `${pon}.RXPower`, String(Math.round(rx * 100)), 'xsd:int')
    put(profile, `${pon}.TXPower`, String(Math.round(tx * 100)), 'xsd:int')
    put(profile, `${pon}.TransceiverTemperature`, String(Math.round(temperature)), 'xsd:int')
    put(profile, `${pon}.SupplyVoltage`, String(voltage), 'xsd:int')
    put(profile, `${pon}.BiasCurrent`, String(Math.round(bias * 100) / 100), 'xsd:decimal')
    put(profile, `${wan}.TotalBytesReceived`, String(received), 'xsd:unsignedLong')
    put(profile, `${wan}.TotalBytesSent`, String(sent), 'xsd:unsignedLong')
    put(profile, `${pppStats}.BytesReceived`, String(received), 'xsd:unsignedLong')
    put(profile, `${pppStats}.BytesSent`, String(sent), 'xsd:unsignedLong')
    put(profile, 'InternetGatewayDevice.DeviceInfo.TemperatureStatus.TemperatureSensor.1.Enable', true, 'xsd:boolean')
    put(profile, 'InternetGatewayDevice.DeviceInfo.TemperatureStatus.TemperatureSensor.1.Name', 'System')
    put(profile, 'InternetGatewayDevice.DeviceInfo.TemperatureStatus.TemperatureSensor.1.Value', String(Math.round(temperature - 4)), 'xsd:int')
    put(profile, 'InternetGatewayDevice.DeviceInfo.UpTime', String(3600 + seed * 113 + tick * Math.round(intervalMs / 1000)), 'xsd:unsignedInt')

    const rssi2g = -48 - ((seed + tick) % 15)
    const rssi5g = -43 - ((seed * 2 + tick) % 18)
    for (const parameter of Object.keys(profile)) {
      if (/WLANConfiguration\.1\.AssociatedDevice\.\d+\.(RSSI|AssociatedDeviceRssi|AssociatedDeviceRSSI|X_.+RSSI|X_.+Rssi)$/.test(parameter)) {
        put(profile, parameter, String(rssi2g), 'xsd:int')
      }
    }
    put(profile, `${wlan5g}.AssociatedDevice.1.AssociatedDeviceRssi`, String(rssi5g), 'xsd:int')

    const lan1Up = tick % 12 !== 0
    const lan2Up = (tick + seed) % 5 === 0
    for (let port = 1; port <= 4; port += 1) {
      const lan = `InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.${port}`
      const up = port === 1 ? lan1Up : port === 2 ? lan2Up : false
      put(profile, `${lan}.Status`, up ? 'Up' : 'NoLink')
      put(profile, `${lan}.CurrentBitRate`, up ? (port === 1 ? '1000' : '100') : '0', 'xsd:unsignedInt')
      put(profile, `${lan}.Stats.BytesReceived`, String(up ? Math.round(received / (port + 1)) : 0), 'xsd:unsignedLong')
      put(profile, `${lan}.Stats.BytesSent`, String(up ? Math.round(sent / (port + 1)) : 0), 'xsd:unsignedLong')
    }
  }

  update()
  const timer = setInterval(update, Math.max(5_000, Number(intervalMs) || 30_000))
  timer.unref()
  return { update, stop: () => clearInterval(timer) }
}

module.exports = { installDynamicTelemetry }
