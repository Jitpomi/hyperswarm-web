import { createServer } from 'http'
import Hyperswarm from 'hyperswarm'
import { Http3Server } from '@fails-components/webtransport'
import { readFileSync } from 'fs'
import { join } from 'path'

const DEFAULT_PORT = 4977 // HYPR on a phone pad

export class HyperswarmBridge {
  constructor(opts = {}) {
    this.port = opts.port || DEFAULT_PORT
    this.swarm = new Hyperswarm()
    this.webTransport = null

    // Load certificates
    const certsDir = new URL('./certs', import.meta.url).pathname
    this.cert = opts.cert || readFileSync(join(certsDir, 'cert.pem'))
    this.privKey = opts.privKey || readFileSync(join(certsDir, 'cert.key'))
  }

  async start() {
    // Create WebTransport server
    this.webTransport = new Http3Server({
      port: this.port,
      host: 'localhost',
      cert: this.cert,
      privKey: this.privKey,
      secret: 'mysecret' // Required for HTTP/3
    })

    // Start the server
    this.webTransport.startServer()

    // Wait for server to be ready
    await this.webTransport.ready

    // Handle new WebTransport sessions
    const sessionStream = this.webTransport.sessionStream('/')
    const reader = sessionStream.getReader()

    while (true) {
      const { value: session, done } = await reader.read()
      if (done) break

      session.ready.then(() => {
        this._handleSession(session).catch(console.error)
      })
    }

    console.log(`Hyperswarm WebTransport bridge listening on port ${this.port}`)
  }

  async _handleSession(session) {
    // Each session represents a browser client
    try {
      const incomingStream = await session.incomingBidirectionalStreams
      const reader = incomingStream.getReader()

      while (true) {
        const { value: stream, done } = await reader.read()
        if (done) break

        const streamReader = stream.readable.getReader()
        const { value: message } = await streamReader.read()
        streamReader.releaseLock()

        const { type, topic } = JSON.parse(new TextDecoder().decode(message))
        
        if (type === 'join') {
          // Join the Hyperswarm network for this topic
          const discovery = this.swarm.join(Buffer.from(topic, 'hex'))
          
          // Handle new peer connections from the DHT
          this.swarm.on('connection', (peerStream, info) => {
            if (info.topic.equals(Buffer.from(topic, 'hex'))) {
              this._bridgeStreams(stream, peerStream)
            }
          })

          // Cleanup when browser disconnects
          stream.readable.closed.then(() => {
            discovery.destroy()
          })
        }
      }
    } catch (err) {
      console.error('Session error:', err)
      session.close()
    }
  }

  _bridgeStreams(browserStream, peerStream) {
    // Bridge the browser's WebTransport stream with the peer's UDP stream
    browserStream.readable.pipeTo(peerStream.writable).catch(() => {})
    peerStream.readable.pipeTo(browserStream.writable).catch(() => {})

    // Handle cleanup
    const cleanup = () => {
      browserStream.close()
      peerStream.destroy()
    }

    browserStream.readable.closed.then(cleanup)
    peerStream.on('close', cleanup)
  }

  async stop() {
    if (this.webTransport) {
      this.webTransport.stopServer()
      await this.webTransport.closed
    }
    if (this.swarm) {
      await this.swarm.destroy()
    }
  }
}

// CLI support
if (process.argv[1] === import.meta.url) {
  const bridge = new HyperswarmBridge({
    port: process.env.PORT || DEFAULT_PORT
  })
  
  bridge.start().catch(console.error)
  
  process.on('SIGINT', () => {
    bridge.stop().catch(console.error)
  })
}
