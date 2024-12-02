import { createServer } from 'http'
import { Server } from 'socket.io'
import express from 'express'
import cors from 'cors'
import { EventEmitter } from 'events'

export class SignalingServer extends EventEmitter {
  constructor(opts = {}) {
    super()
    
    // Server Configuration
    this.config = {
      port: opts.port || 9000,
      maxConnectionsPerPeer: opts.maxConnectionsPerPeer || 5,
      connectionTimeout: opts.connectionTimeout || 30000,
      origins: opts.origins || '*'
    }

    // Peer and Room Management
    this.peers = new Map()
    this.rooms = new Map()

    // Express and Socket.IO Setup
    this.app = express()
    this.httpServer = createServer(this.app)
    this.io = new Server(this.httpServer, {
      cors: {
        origin: this.config.origins,
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000
    })

    this.setupMiddleware()
    this.setupSocketEvents()
  }

  setupMiddleware() {
    this.app.use(cors())
    this.app.use(express.json())

    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        connectedPeers: this.peers.size,
        rooms: Array.from(this.rooms.keys())
      })
    })
  }

  setupSocketEvents() {
    this.io.on('connection', (socket) => {
      console.log('New client connected:', socket.id)
      this.emit('client_connected', socket.id)

      socket.on('register', (peerId, metadata = {}) => {
        if (!peerId || typeof peerId !== 'string') {
          socket.emit('registration_error', 'Invalid peer ID')
          return
        }

        const existingPeerConnections = Array.from(this.peers.values())
          .filter(p => p.id === peerId)

        if (existingPeerConnections.length >= this.config.maxConnectionsPerPeer) {
          socket.emit('registration_error', 'Max connections exceeded')
          return
        }

        const peerInfo = {
          id: peerId,
          socketId: socket.id,
          metadata,
          registeredAt: Date.now(),
          lastActive: Date.now()
        }

        this.peers.set(socket.id, peerInfo)
        socket.emit('registration_success', { socketId: socket.id, peerId })
        this.emit('peer_registered', peerInfo)
      })

      socket.on('webrtc:signal', (data) => {
        const { targetPeerId, signalData } = data
        
        const targetPeers = Array.from(this.peers.values())
          .filter(p => p.id === targetPeerId)

        if (targetPeers.length === 0) {
          socket.emit('signaling_error', {
            code: 'PEER_NOT_FOUND',
            message: 'Target peer not found',
            targetPeerId
          })
          return
        }

        const sourcePeer = this.peers.get(socket.id)
        if (!sourcePeer) {
          socket.emit('signaling_error', {
            code: 'NOT_REGISTERED',
            message: 'Source peer not registered'
          })
          return
        }

        targetPeers.forEach(targetPeer => {
          socket.to(targetPeer.socketId).emit('webrtc:signal', {
            sourcePeerId: sourcePeer.id,
            signalData
          })
        })
      })

      socket.on('disconnect', () => {
        const peerInfo = this.peers.get(socket.id)
        if (peerInfo) {
          this.peers.delete(socket.id)
          this.emit('peer_disconnected', peerInfo)
          console.log(`Peer disconnected: ${peerInfo.id}`)
        }
      })
    })
  }

  async listen(port = this.config.port) {
    return new Promise((resolve, reject) => {
      const startServer = (port) => {
        this.httpServer.listen(port, () => {
          this.config.port = port
          console.log(`Signaling server listening on port ${port}`)
          this.emit('listening', { port })
          resolve({ port })
        })
      }

      this.httpServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} in use, trying random port`)
          startServer(0)
        } else {
          reject(err)
        }
      })

      startServer(port)
    })
  }

  async close() {
    return new Promise((resolve) => {
      if (!this.httpServer) {
        return resolve()
      }

      const cleanup = () => {
        this.io.close()
        this.peers.clear()
        this.rooms.clear()
        this.emit('closed')
        resolve()
      }

      this.httpServer.close(() => {
        console.log('Signaling server stopped')
        cleanup()
      })
    })
  }

  get port() {
    return this.config.port
  }
}

// Standalone server initialization if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const signalingServer = new SignalingServer({ debug: true })
  signalingServer.listen().catch(console.error)
}

export default SignalingServer
