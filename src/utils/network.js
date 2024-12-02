import os from 'os'
import { networkInterfaces } from 'os'

/**
 * Get all network interfaces' IP addresses
 * @returns {Promise<Array<{address: string, family: string}>>}
 */
export async function getNetworkInterfaces() {
  const interfaces = networkInterfaces()
  const addresses = []

  for (const [name, nets] of Object.entries(interfaces)) {
    for (const net of nets) {
      // Skip internal and link-local addresses
      if (!net.internal && !net.address.startsWith('fe80::')) {
        addresses.push({
          name,
          address: net.address,
          family: net.family,
          internal: net.internal
        })
      }
    }
  }

  return addresses
}

/**
 * Get the first non-internal IPv4 address
 * @returns {Promise<string>}
 */
export async function getIPv4Address() {
  const interfaces = await getNetworkInterfaces()
  const ipv4 = interfaces.find(net => net.family === 'IPv4')
  return ipv4 ? ipv4.address : '127.0.0.1'
}

/**
 * Get the first non-internal IPv6 address
 * @returns {Promise<string>}
 */
export async function getIPv6Address() {
  const interfaces = await getNetworkInterfaces()
  const ipv6 = interfaces.find(net => net.family === 'IPv6')
  return ipv6 ? ipv6.address : '::1'
}

/**
 * Get all available IP addresses
 * @returns {Promise<{ipv4: string[], ipv6: string[]}>}
 */
export async function getAllIPs() {
  const interfaces = await getNetworkInterfaces()
  return {
    ipv4: interfaces.filter(net => net.family === 'IPv4').map(net => net.address),
    ipv6: interfaces.filter(net => net.family === 'IPv6').map(net => net.address)
  }
}
