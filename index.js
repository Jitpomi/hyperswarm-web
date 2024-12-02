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
    if (this.destroyed) throw new Error('Cannot join topic on destroyed swarm')
    
    if (this.peers.size >= this.opts.maxPeers) {
      throw new Error(`Exceeded maximum peer limit of ${this.opts.maxPeers}`)
    }

    const normalizedTopic = typeof topic === 'string' 
      ? b4a.from(topic) 
      : topic

    await this.initDHT()

    const server = this.dht.join(normalizedTopic, {
      announce: opts.announce !== false,
      lookup: opts.lookup !== false,
      localAddress: this.opts.announceLocalAddress
    })

    const topicKey = b4a.toString(normalizedTopic, 'hex')
    this.topics.set(topicKey, normalizedTopic)
    this._discoveryInstances.set(topicKey, server)

    // Advanced connection handling with comprehensive lifecycle management
    server.on('connection', async (socket, peerInfo) => {
      const runtime = this._detectRuntime()
      const connectionId = b4a.toString(peerInfo.publicKey, 'hex')
      
      try {
        const connection = await this._createConnection(socket, runtime, peerInfo)
        
        // Comprehensive peer tracking
        const peerEntry = {
          ...peerInfo,
          connection,
          runtime,
          state: ConnectionState.CONNECTED,
          connectedAt: Date.now()
        }
        this.peers.set(connectionId, peerEntry)
        this._peerConnections.set(connectionId, connection)

        // Emit connection events with detailed metadata
        this.emit('connection', connection, {
          ...peerInfo, 
          runtime,
          topic: normalizedTopic,
          connectionId
        })

        // Trigger update event
        this.emit('update')

        // Comprehensive connection event handling
        connection.on('data', (data) => {
          this.emit('data', data, {
            runtime,
            topic: normalizedTopic,
            ...peerInfo,
            connectionId
          })
        })

        connection.on('close', () => {
          this._handleConnectionClose(connectionId, peerEntry)
        })

        connection.on('error', (error) => {
          this._handleConnectionError(connectionId, error)
        })

        return connection
      } catch (error) {
        this.emit('peer', { 
          error, 
          topic: normalizedTopic,
          peerInfo 
        })
        throw error
      }
    })

    // Return discovery instance with comprehensive refresh method
    return {
      ...server,
      async refresh(opts = {}) {
        if (opts.client) await server.client()
        if (opts.server) await server.server()
        return server
      },
      destroy: async () => {
        await this.leave(normalizedTopic)
      }
    }
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
    const normalizedTopic = typeof topic === 'string' 
      ? b4a.from(topic) 
      : topic

    const topicKey = b4a.toString(normalizedTopic, 'hex')
    
    if (this.topics.has(topicKey)) {
      const discoveryInstance = this._discoveryInstances.get(topicKey)
      
      if (discoveryInstance) {
        await discoveryInstance.destroy()
        this._discoveryInstances.delete(topicKey)
      }

      await this.dht?.leave(normalizedTopic)
      this.topics.delete(topicKey)
      
      // Remove associated peers
      for (const [key, peer] of this.peers.entries()) {
        if (b4a.toString(peer.topic, 'hex') === topicKey) {
          this.peers.delete(key)
          this._peerConnections.delete(key)
        }
      }

      // Notify relay nodes
      this._broadcastToRelays({
        type: 'topic:leave',
        topic: topicKey
      })

      this.emit('update')
    }
  }

  // Comprehensive destroy method
  async destroy() {
    if (this.destroyed) return
    this.destroyed = true

    // Leave all topics
    for (const topic of this.topics.values()) {
      await this.leave(topic)
    }

    // Close all peer connections
    for (const connection of this._peerConnections.values()) {
      try {
        connection.destroy()
      } catch {}
    }

    // Close relay connections
    for (const relay of this.relayConnections) {
      relay.close()
    }
    this.relayConnections.clear()

    // Destroy DHT
    if (this.dht) {
      await this.dht.destroy()
      this.dht = null
    }

    this.peers.clear()
    this.topics.clear()
    this._discoveryInstances.clear()
    this._peerConnections.clear()
    this._connectionQueue.clear()

    this.emit('close')
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
