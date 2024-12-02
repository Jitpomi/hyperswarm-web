import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'

const certsDir = new URL('../certs', import.meta.url).pathname

// Generate self-signed certificate
console.log('Generating self-signed certificate...')

// Create certs directory if it doesn't exist
execSync(`mkdir -p ${certsDir}`)

// Generate CA key and certificate
execSync(`openssl req -x509 -newkey rsa:2048 -days 365 -nodes \
  -keyout ${join(certsDir, 'cert.key')} \
  -out ${join(certsDir, 'cert.pem')} \
  -subj "/CN=localhost/O=WebTransport Test/C=US" \
  -addext "subjectAltName = DNS:localhost"`)

console.log('Certificates generated successfully!')
