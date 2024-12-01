const hyperswarm = require('hyperswarm')
const HyperswarmServer = require('./server')
const hyperswarmweb = require('./')
const test = require('tape')
const crypto = require('crypto')
const wrtc = require('@koush/wrtc')
const getPort = require('get-port')

let server = null
let port = null

// Add timeout to prevent tests from hanging
const TEST_TIMEOUT = 10000 // 10 seconds

test('Setup', function (t) {
  // Initialize local proxy
  server = new HyperswarmServer()
  getPort().then((p) => {
    port = p
    server.listen(port)
    t.end()
  })
});

test('Connect to local hyperswarm through local proxy', function (t) {
  t.plan(6)
  
  const timeout = setTimeout(() => {
    t.fail('Test timed out')
    cleanup()
  }, TEST_TIMEOUT)

  function cleanup() {
    clearTimeout(timeout)
    try {
      swarm && swarm.destroy()
      client && client.destroy()
    } catch (err) {
      console.error('Cleanup error:', err)
    }
  }

  try {
    // Initialize local hyperswarm instance, listen for peers
    const swarm = hyperswarm()

    // Initialize client
    const hostname = `ws://localhost:${port}`
    const client = hyperswarmweb({
      bootstrap: [hostname]
    })

    // Test connections in regular hyperswarm
    swarm.once('connection', (connection, info) => {
      t.pass('Got connection locally')
      connection.once('end', () => {
        t.pass('Local connection ended')
        cleanup()
      })
      connection.once('data', () => {
        t.pass('Local connection got data')
      })
      connection.write('Hello World')
    })

    // Test connections in proxied hyperswarm
    client.once('connection', (connection) => {
      connection.on('error', (err) => {
        console.error('Client connection error:', err)
      })

      t.pass('Got proxied connection')
      connection.once('data', () => {
        t.pass('Proxied connection got data')
        connection.end(() => {
          t.pass('Proxied connection closed')
          cleanup()
        })
      })

      connection.write('Hello World')

      client.on('connection', (connection2) => {
        connection2.on('error', (err) => {
          console.error('Secondary connection error:', err)
        })
      })
    })

    const key = crypto.randomBytes(32)

    // Join channel on local hyperswarm
    swarm.join(key, {
      announce: true,
      lookup: true
    })

    // Join channel on client
    client.join(key)
  } catch (e) {
    console.error(e)
    t.fail(e)
    cleanup()
  }
})

test('Connect to webrtc peers', function (t) {
  t.plan(8)

  const timeout = setTimeout(() => {
    t.fail('Test timed out')
    cleanup()
  }, TEST_TIMEOUT)

  function cleanup() {
    clearTimeout(timeout)
    try {
      client1 && client1.destroy()
      client2 && client2.destroy()
    } catch (err) {
      console.error('Cleanup error:', err)
    }
  }

  try {
    // Initialize client
    const hostname = `ws://localhost:${port}`
    const client1 = hyperswarmweb({
      bootstrap: [hostname],
      simplePeer: {
        wrtc
      }
    })
    const client2 = hyperswarmweb({
      bootstrap: [hostname],
      simplePeer: {
        wrtc
      }
    })

    client1.once('connection', (connection, info) => {
      t.pass('Got connection from client2')
      connection.once('end', () => {
        t.pass('Connection client1 -> client2 ended')
        cleanup()
      })
      connection.once('data', () => {
        t.pass('The client1 got data')
      })
      connection.write('Hello World')
    })

    client2.once('connection', (connection) => {
      connection.on('error', (err) => {
        console.error('Client2 connection error:', err)
      })

      t.pass('Got connection from client1')
      connection.once('data', () => {
        t.pass('The client2 got data')
        connection.end(() => {
          t.pass('Connection client2 -> client1 ended')
          cleanup()
        })
      })

      connection.write('Hello World')
    })

    const key = crypto.randomBytes(32)

    // Join channel on client
    client1.join(key)
    client2.join(key)

    let signalCount = 0
    function checkSignalComplete() {
      signalCount++
      if (signalCount === 2) {
        // Both clients are connected to signal server
        t.pass('Both clients connected to signal server')
      }
    }

    client1.webrtc.signal.once('connected', () => {
      t.pass('client1 should establish a websocket connection with the signal')
      checkSignalComplete()
    })
    client2.webrtc.signal.once('connected', () => {
      t.pass('client2 should establish a websocket connection with the signal')
      checkSignalComplete()
    })
  } catch (e) {
    console.error(e)
    t.fail(e)
    cleanup()
  }
})

test('Teardown', function (t) {
  try {
    server.destroy()
  } catch (err) {
    console.error('Server cleanup error:', err)
  }
  t.end()
});

import { test } from 'brittle'
import HyperswarmWeb from './index.js'
import b4a from 'b4a'
import Hypercore from 'hypercore'
import Corestore from 'corestore'
import RAM from 'random-access-memory'
import getPort from 'get-port'

test('basic swarm functionality', async t => {
  const swarm1 = new HyperswarmWeb()
  const swarm2 = new HyperswarmWeb()

  t.teardown(async () => {
    await swarm1.destroy()
    await swarm2.destroy()
  })

  const topic = b4a.from('test-topic')
  
  let connected = false
  
  swarm1.on('connection', (stream, info) => {
    t.ok(stream, 'got stream')
    t.ok(info.peer, 'got peer info')
    connected = true
  })

  await swarm1.join(topic)
  await swarm2.join(topic)

  // Wait for connection
  await new Promise(r => setTimeout(r, 1000))
  t.ok(connected, 'peers connected')
})

test('hypercore replication', async t => {
  const store1 = new Corestore(RAM)
  const store2 = new Corestore(RAM)
  
  const core1 = new Hypercore(store1)
  await core1.ready()
  
  const core2 = new Hypercore(store2, core1.key)
  await core2.ready()

  const swarm1 = new HyperswarmWeb()
  const swarm2 = new HyperswarmWeb()

  t.teardown(async () => {
    await swarm1.destroy()
    await swarm2.destroy()
    await store1.close()
    await store2.close()
  })

  swarm1.on('connection', stream => {
    store1.replicate(stream)
  })

  swarm2.on('connection', stream => {
    store2.replicate(stream)
  })

  await swarm1.join(core1.discoveryKey)
  await swarm2.join(core1.discoveryKey)

  await core1.append('hello')
  await core1.append('world')

  // Wait for replication
  await new Promise(r => setTimeout(r, 1000))

  t.is(core2.length, 2, 'replicated correct number of blocks')
  t.is(await core2.get(0), 'hello', 'replicated first block')
  t.is(await core2.get(1), 'world', 'replicated second block')
})

test('browser peer detection', async t => {
  const swarm1 = new HyperswarmWeb()
  const swarm2 = new HyperswarmWeb()

  t.teardown(async () => {
    await swarm1.destroy()
    await swarm2.destroy()
  })

  const topic = b4a.from('test-topic')
  
  swarm1.on('connection', (stream, info) => {
    t.is(info.type, 'browser', 'detected browser peer')
  })

  await swarm1.join(topic)
  await swarm2.join(topic)

  // Wait for connection
  await new Promise(r => setTimeout(r, 1000))
})

test('multiple topics', async t => {
  const swarm1 = new HyperswarmWeb()
  const swarm2 = new HyperswarmWeb()

  t.teardown(async () => {
    await swarm1.destroy()
    await swarm2.destroy()
  })

  const topic1 = b4a.from('topic-1')
  const topic2 = b4a.from('topic-2')
  
  let connections = 0
  
  swarm1.on('connection', () => {
    connections++
  })

  await swarm1.join(topic1)
  await swarm1.join(topic2)
  await swarm2.join(topic1)
  
  // Wait for connection
  await new Promise(r => setTimeout(r, 1000))
  t.is(connections, 1, 'got connection for first topic')

  await swarm2.join(topic2)
  
  // Wait for second connection
  await new Promise(r => setTimeout(r, 1000))
  t.is(connections, 2, 'got connection for second topic')
})

test('connection events', async t => {
  const swarm1 = new HyperswarmWeb()
  const swarm2 = new HyperswarmWeb()

  t.teardown(async () => {
    await swarm1.destroy()
    await swarm2.destroy()
  })

  const topic = b4a.from('test-topic')
  
  let connected = false
  let disconnected = false
  
  swarm1.on('connection', () => {
    connected = true
  })

  swarm1.on('disconnection', () => {
    disconnected = true
  })

  await swarm1.join(topic)
  await swarm2.join(topic)

  // Wait for connection
  await new Promise(r => setTimeout(r, 1000))
  t.ok(connected, 'got connection event')

  await swarm2.destroy()

  // Wait for disconnection
  await new Promise(r => setTimeout(r, 1000))
  t.ok(disconnected, 'got disconnection event')
})

test('firewall', async t => {
  const swarm1 = new HyperswarmWeb({
    firewall: (peer) => {
      return peer.host !== 'blocked-peer'
    }
  })
  
  const swarm2 = new HyperswarmWeb()

  t.teardown(async () => {
    await swarm1.destroy()
    await swarm2.destroy()
  })

  const topic = b4a.from('test-topic')
  
  let connected = false
  
  swarm1.on('connection', () => {
    connected = true
  })

  await swarm1.join(topic)
  await swarm2.join(topic)

  // Wait for potential connection
  await new Promise(r => setTimeout(r, 1000))
  t.ok(connected, 'allowed connection')
})

test('cleanup', async t => {
  const swarm = new HyperswarmWeb()
  const topic = b4a.from('test-topic')
  
  await swarm.join(topic)
  await swarm.destroy()
  
  t.is(swarm.connections.size, 0, 'closed all connections')
  t.is(swarm.peers.size, 0, 'removed all peers')
})
