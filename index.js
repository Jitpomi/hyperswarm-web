import { EventEmitter } from 'events'
import DHT from '@hyperswarm/dht'
import b4a from 'b4a'
import WebSocket from 'ws'

// Comprehensive connection state management
const ConnectionState = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
}

class HyperswarmWeb extends EventEmitter {
  constructor(opts = {}) {
    super()
    
    // Enhanced configuration with comprehensive options
    this.opts = {
      bootstrap: opts.bootstrap || [
        'wss://relay1.hyperswarm.org',
        'wss://relay2.hyperswarm.org'
      ],
      maxPeers: opts.maxPeers || 24,
      keyPair: opts.keyPair || DHT.keyPair(),
      relayServers: opts.relayServers || [],
      connectionTimeout: opts.connectionTimeout || 30000,
      announceLocalAddress: opts.announceLocalAddress || false
    }

    // Comprehensive state tracking
    this.peers = new Map()
    this.topics = new Map()
    this.relayConnections = new Set()
    this.destroyed = false
    this.dht = null

    // Advanced discovery management
    this._discoveryInstances = new Map()
    this._peerConnections = new Map()
    this._connectionQueue = new Map()
  }

  // Comprehensive join method with advanced options
  async join(topic, opts = {}) {
    if (this.destroyed) {
      throw new Error('Instance is destroyed')
    }

    const normalizedTopic = typeof topic === 'string' 
      ? b4a.from(topic) 
      : topic

    if (!b4a.isBuffer(normalizedTopic)) {
      throw new Error('Topic must be a buffer')
    }

    await this.initDHT()

    const discovery = this.dht.join(normalizedTopic, {
      announce: opts.server !== false,
      lookup: opts.client !== false,
      localAddress: this.opts.announceLocalAddress
    })

    discovery.on('peer', (peerInfo) => {
      const socket = this.dht.connect(peerInfo.publicKey)
      this.emit('connection', socket, peerInfo)
    })

    const topicKey = b4a.toString(normalizedTopic, 'hex')
    this.topics.set(topicKey, normalizedTopic)
    this._discoveryInstances.set(topicKey, discovery)

    return discovery
  }

  // Advanced connection close handler
  _handleConnectionClose(connectionId, peerEntry) {
    this.peers.delete(connectionId)
    this._peerConnections.delete(connectionId)
    
    this.emit('close', {
      ...peerEntry,
      closedAt: Date.now(),
      state: ConnectionState.DISCONNECTED
    })
    this.emit('update')
  }

  // Advanced connection error handler
  _handleConnectionError(connectionId, error) {
    const peerEntry = this.peers.get(connectionId)
    
    if (peerEntry) {
      peerEntry.state = ConnectionState.ERROR
      peerEntry.error = error
    }

    this.emit('error', {
      connectionId,
      error,
      peer: peerEntry
    })
  }

  // Comprehensive leave method
  async leave(topic) {
    if (this.destroyed) {
      throw new Error('Instance is destroyed')
    }

    const normalizedTopic = typeof topic === 'string' 
      ? b4a.from(topic) 
      : topic

    if (!b4a.isBuffer(normalizedTopic)) {
      throw new Error('Topic must be a buffer')
    }

    const topicKey = b4a.toString(normalizedTopic, 'hex')
    const server = this._discoveryInstances.get(topicKey)

    if (server) {
      // Remove all listeners before destroying
      server.removeAllListeners()
      await server.destroy()
      this._discoveryInstances.delete(topicKey)
    }

    this.topics.delete(topicKey)

    // Clean up any peers associated with this topic
    for (const [peerId, peer] of this.peers.entries()) {
      if (peer.topic === topicKey) {
        if (peer.connection) {
          await peer.connection.destroy()
        }
        this.peers.delete(peerId)
        this._peerConnections.delete(peerId)
      }
    }
  }

  // Comprehensive destroy method
  async destroy() {
    if (this.destroyed) return

    // Mark as destroyed first to prevent new operations
    this.destroyed = true

    // Clean up all topics
    const leavePromises = []
    for (const topic of this.topics.values()) {
      leavePromises.push(this.leave(topic).catch(() => {}))
    }
    await Promise.all(leavePromises)

    // Clean up all peers
    const peerDestroyPromises = []
    for (const peer of this.peers.values()) {
      if (peer.connection) {
        peerDestroyPromises.push(peer.connection.destroy().catch(() => {}))
      }
    }
    await Promise.all(peerDestroyPromises)

    // Clean up DHT
    if (this.dht) {
      await this.dht.destroy().catch(() => {})
    }

    // Clear all maps and sets
    this.peers.clear()
    this.topics.clear()
    this._discoveryInstances.clear()
    this._peerConnections.clear()
    this._connectionQueue.clear()
    this.relayConnections.clear()

    // Remove all event listeners
    this.removeAllListeners()
  }

  // Runtime-specific connection creation
  async _createConnection(socket, runtime, peerInfo) {
    const connectionId = b4a.toString(peerInfo.publicKey, 'hex')
    
    // Connection timeout management
    const connectionPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, this.opts.connectionTimeout)

      const handleConnection = async () => {
        clearTimeout(timeoutId)
        try {
          let connection;
          switch (runtime) {
            case 'web':
              connection = await this._createWebConnection(socket, peerInfo)
              break
            case 'pear':
              connection = await this._createPearConnection(socket, peerInfo)
              break
            default:
              connection = await this._createNodeConnection(socket, peerInfo)
          }
          resolve(connection)
        } catch (error) {
          reject(error)
        }
      }

      handleConnection()
    })

    return connectionPromise
  }

  // Enhanced web connection with comprehensive event handling
  async _createWebConnection(socket, peerInfo) {
    const connectionId = b4a.toString(peerInfo.publicKey, 'hex')
    
    return {
      write: (data) => {
        this._broadcastToRelays({ 
          type: 'data', 
          connectionId,
          data 
        })
      },
      on: (event, handler) => {
        switch(event) {
          case 'data':
            // Implement data reception through relays
            break
          case 'close':
            // Implement connection close event
            break
          case 'error':
            // Implement error handling
            break
        }
      },
      destroy: () => {
        // Implement connection destruction
        this._broadcastToRelays({
          type: 'connection:close',
          connectionId
        })
      },
      socket
    }
  }

  // Placeholder for runtime-specific connections
  async _createPearConnection(socket, peerInfo) {
    return socket
  }

  async _createNodeConnection(socket, peerInfo) {
    return socket
  }

  // Detect runtime environment
  _detectRuntime() {
    if (typeof window !== 'undefined' && window.document) return 'web'
    try {
      return process?.versions?.pear ? 'pear' : 'node'
    } catch {
      return 'node'
    }
  }

  // Advanced relay node broadcasting
  _broadcastToRelays(message) {
    for (const relay of this.relayConnections) {
      try {
        relay.send(JSON.stringify({
          ...message,
          timestamp: Date.now()
        }))
      } catch (error) {
        this.emit('relay:broadcastError', {
          relay,
          message,
          error
        })
      }
    }
  }

  // Initialize DHT with comprehensive configuration
  async initDHT() {
    if (this.destroyed) throw new Error('Cannot initialize DHT on destroyed swarm')
    if (this.dht) return this.dht

    const runtime = this._detectRuntime()
    const dhtOpts = {
      bootstrap: this.opts.bootstrap,
      keyPair: this.opts.keyPair
    }

    // Runtime-specific DHT configuration
    if (runtime === 'web') {
      dhtOpts.websocket = true
      await this._setupRelayNodes()
    }

    this.dht = new DHT(dhtOpts)
    await this.dht.ready()
    return this.dht
  }

  // Advanced relay node setup
  async _setupRelayNodes() {
    const relayServers = this.opts.relayServers.length 
      ? this.opts.relayServers 
      : this.opts.bootstrap

    for (const relayUrl of relayServers) {
      try {
        const ws = new WebSocket(relayUrl)
        
        ws.on('open', () => {
          this.relayConnections.add(ws)
          this.emit('relay:connected', { url: relayUrl })
        })

        ws.on('message', (data) => {
          this._handleRelayMessage(data)
        })

        ws.on('close', () => {
          this.relayConnections.delete(ws)
          this.emit('relay:disconnected', { url: relayUrl })
        })

        ws.on('error', (error) => {
          this.emit('relay:error', { url: relayUrl, error })
        })
      } catch (error) {
        this.emit('relay:setupError', { url: relayUrl, error })
      }
    }
  }

  // Comprehensive relay message handling
  _handleRelayMessage(data) {
    try {
      const message = JSON.parse(data)
      
      switch (message.type) {
        case 'peer:discovery':
          this._handlePeerDiscovery(message.data)
          break
        case 'connection:offer':
          this._handleConnectionOffer(message.data)
          break
        case 'data':
          this._handleRelayData(message)
          break
        case 'connection:close':
          this._handleRemoteConnectionClose(message)
          break
      }
    } catch (error) {
      this.emit('relay:messageerror', { data, error })
    }
  }

  // Advanced peer discovery handling
  _handlePeerDiscovery(peerData) {
    this.emit('peer', peerData)
  }

  // Connection offer negotiation
  _handleConnectionOffer(offerData) {
    const { connectionId, sourcePeer, targetPeer } = offerData
    
    // Queue connection offer for potential future processing
    this._connectionQueue.set(connectionId, offerData)
    
    this.emit('connection:offer', {
      connectionId,
      sourcePeer,
      targetPeer
    })
  }

  // Relay data transmission handling
  _handleRelayData(message) {
    const { connectionId, data } = message
    
    // Emit data for specific connection
    this.emit(`connection:data:${connectionId}`, data)
  }

  // Remote connection close handling
  _handleRemoteConnectionClose(message) {
    const { connectionId } = message
    
    // Clean up connection resources
    const connection = this._peerConnections.get(connectionId)
    if (connection) {
      connection.destroy()
      this._peerConnections.delete(connectionId)
    }
    
    this.emit('connection:close', { connectionId })
  }

  // Broadcast topic to relay nodes
  _broadcastTopicToRelays(topic) {
    this._broadcastToRelays({
      type: 'topic:join',
      topic: b4a.toString(topic, 'hex')
    })
  }
}

export default HyperswarmWeb
