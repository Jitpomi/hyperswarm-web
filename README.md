# HyperswarmWeb

HyperswarmWeb is a specialized library designed to enable seamless peer-to-peer connectivity between web applications and Pear runtime apps. It leverages the Hyperswarm DHT protocol to create a bridge between web-based and Pear-based applications in a decentralized network.

## Features

- Seamless web-to-Pear runtime connectivity
- Decentralized peer discovery using Hyperswarm DHT
- Simple topic-based peer connections
- Event-driven architecture
- Lightweight and minimal dependencies

## Architecture

### Web-to-Pear Runtime Bridge

HyperswarmWeb creates a bridge between web applications and Pear runtime apps using the Hyperswarm DHT network for peer discovery.

```
+-------------+       +------------------------+       +-------------+
|   Web App   | <---> | Hyperswarm DHT Network | <--> | Pear App    |
+-------------+       +------------------------+       +-------------+
       |                    (Common Topic)                   |
       +-----------------------------------------------------+
                         Direct P2P Connection
```

### Network Flow

1. **Topic Announcement and Discovery**
```
+-------------+                                      +-------------+
|   Web App   |                                     |  Pear App   |
+-------------+                                     +-------------+
      |                +------------+                     |
      +--------------> | Join Topic | <------------------+
      |                +------------+                     |
      |                      |                           |
      |              +---------------+                   |
      +------------> | DHT Broadcast | <----------------+
                     +---------------+
```

2. **Web-to-Pear Connection**
```
+-------------+       +-----------------+       +-------------+
|   Web App   | <---> |  P2P Protocol  | <--> |  Pear App   |
+-------------+       +-----------------+       +-------------+
     Browser                DHT              Pear Runtime
```

## Runtime Compatibility

### Library Selection Guide

- **Web Applications**: Use `HyperswarmWeb`
- **Pear Runtime Applications**: Use standard `Hyperswarm`

### Why Two Different Libraries?

`HyperswarmWeb` is a specialized implementation that bridges web applications to the Pear network:
- Relay nodes enable web apps to join Pear network
- Overcome browser networking limitations
- Provide seamless cross-runtime connectivity

`Hyperswarm` remains the standard implementation for Node.js and Pear runtime environments.

### Core Concept: Web to Pear Network Bridge

```
+-------------------+     +-------------------+
|   Web App A       |     |   Web App B       |
| (Browser)         |     | (Browser)         |
+--------+----------+     +----------+--------+
         |                            |
         v                            v
+-------------------+     +-------------------+
| HyperswarmWeb     |     | HyperswarmWeb     |
| Relay Nodes       |     | Relay Nodes       |
+-------------------+     +-------------------+
         |                            |
         +----------+----------+
                    |
            Pear Network DHT
                    |
+-------------------+     +-------------------+
|   Pear App C      |     |   Pear App D      |
| (Pear Runtime)    |     | (Pear Runtime)    |
+-------------------+     +-------------------+

Connection Workflow:
1. Web apps connect via relay nodes
2. Relay nodes join Pear network DHT
3. Enable cross-runtime communication
4. Seamless peer discovery
```

### How HyperswarmWeb Works

- **Relay Nodes**: Core mechanism to connect web apps
- **Purpose**: Bridge web browsers to Pear network
- **Mechanism**: 
  1. Establish WebSocket connections
  2. Participate in Pear network DHT
  3. Enable peer discovery for web apps

#### Key Features

- **Web App Connectivity**: Connect browsers to distributed network
- **DHT Participation**: Full integration with Hyperswarm network
- **Runtime Agnostic**: Consistent peer discovery across platforms

### Relay Node Functionality

- Translate browser limitations to network capabilities
- Provide WebSocket-based network access
- Secure, encrypted connection tunnels
- Minimal overhead, stateless forwarding

### Cross-Runtime Communication

- Web apps can discover and connect to Pear runtime peers
- Consistent topic-based peer discovery
- Seamless network participation

### Recommended Usage

```javascript
// Web Application
import HyperswarmWeb from 'hyperswarm-web'

const topic = 'cross-runtime-collaboration'
const swarm = new HyperswarmWeb()

// Automatically connects via relay nodes
const discovery = swarm.join(topic)

swarm.on('connection', (socket, peerInfo) => {
  // Connect to peers across runtimes
})
```

### API Consistency

Both libraries support:
```javascript
// Identical method signatures
const swarm = new HyperswarmWeb(options)  // Web
const swarm = new Hyperswarm(options)     // Pear/Node

// Joining a topic
const discovery = swarm.join(topic, options)
await discovery.refresh({ client, server })

// Connection handling
swarm.on('connection', (socket, peerInfo) => {
  // Consistent socket interface
})

// Peer list updates
swarm.on('update', () => {
  // Works identically in both libraries
})
```

### Key Differences

#### HyperswarmWeb (Web)
- Adds WebSocket relay support
- Handles browser networking constraints
- Lightweight web-specific optimizations

#### Hyperswarm (Pear/Node)
- Native socket support
- Full Node.js networking capabilities
- Direct peer-to-peer connections

### Cross-Runtime Connection Topology

```
+-------------------+     +-------------------+
|   Web App A       |     |   Web App B       |
| HyperswarmWeb     |     | HyperswarmWeb     |
| (with Relay Nodes)|     | (with Relay Nodes)|
+--------+----------+     +----------+--------+
         |                            |
         |   HyperswarmWeb             |
         |   WebSocket Relay Nodes     |
         +----------------------------+
                     |
                     | Shared Topic
                     |
+-------------------+     +-------------------+
|   Pear App C      |     |   Pear App D      |
| Hyperswarm        |     |  Hyperswarm       |
+-------------------+     +-------------------+

Connection Workflow:
1. Pear apps connect directly to DHT
2. HyperswarmWeb provides relay nodes
3. Shared topic enables cross-runtime discovery
4. Runtime-agnostic communication
```

#### Connection Mechanics

- **Discovery**: Hyperswarm DHT tracks all peer locations
- **HyperswarmWeb**: Provides WebSocket relay infrastructure
- **Topic**: Shared identifier enables cross-runtime connections
- **Peer Selection**: Dynamic, based on DHT information

#### Key Interaction Points

1. **Topic Announcement**
   - Pear apps connect directly to DHT
   - HyperswarmWeb relay nodes facilitate web app DHT interaction
   - All peers share common topic

2. **Connection Negotiation**
   - Pear apps: Direct DHT peer exchange
   - HyperswarmWeb: Relay nodes facilitate connection metadata
   - Minimal runtime-specific logic

3. **Connection Establishment**
   - Pear apps: Direct P2P connections
   - HyperswarmWeb: Relay node-assisted connections

#### Runtime-Specific Behaviors

- **Web Apps (HyperswarmWeb)**
  - Integrated WebSocket relay nodes
  - Bootstrap relay node discovery
  - Indirect DHT participation
  - Overcome browser networking limitations

- **Pear Apps (Hyperswarm)**
  - Direct DHT network participation
  - Native P2P connections
  - No relay node dependency

#### HyperswarmWeb Relay Node Characteristics

- Stateless connection forwarding
- Minimal processing overhead
- Distributed across Hyperswarm network
- Provide connectivity bridge for web browsers
- Secure, encrypted relay tunnels

### Connection Reliability

- **Web Apps**: HyperswarmWeb relay node failover
- **Pear Apps**: Direct DHT connections
- **Shared Topic**: Enables cross-runtime discovery
- **Secure**: Encrypted connection metadata

### Example: Multi-Runtime Peer Discovery

```javascript
// Web Application
import HyperswarmWeb from 'hyperswarm-web'

// Pear Runtime Application
import Hyperswarm from 'hyperswarm'

const topic = 'cross-runtime-collaboration'

// Both work identically for peer discovery
const swarm = new HyperswarmWeb(options)  // or new Hyperswarm(options)
const discovery = swarm.join(topic)
await discovery.refresh({ client: true, server: true })

swarm.on('connection', (socket, peerInfo) => {
  // Handle connections from any runtime
})
```

### Performance and Overhead

- `HyperswarmWeb`: Optimized for web browser performance
- `Hyperswarm`: Optimized for Node.js and Pear runtime
- Minimal overhead in cross-runtime communication

### Recommended Usage

1. Use `HyperswarmWeb` for all web application peer discovery
2. Use `Hyperswarm` for Pear runtime and Node.js applications
3. Ensure consistent topic names for cross-runtime discovery

## Compatibility Notes

- Minimum Node.js Version: >=16.0.0
- ES Module support required
- WebSocket-capable browsers recommended for web applications

## Installation

```bash
npm install hyperswarm-web
```

## Usage

### Web Application
```javascript
import HyperswarmWeb from 'hyperswarm-web'

// Create a new instance for web app
const webSwarm = new HyperswarmWeb({
  maxPeers: 24, // Optional: maximum number of peers (default: 24)
  keyPair: null // Optional: custom key pair for DHT
})

// Join a topic to connect with Pear apps
const topic = 'my-pear-app-name'
await webSwarm.join(topic)

// Listen for Pear app connections
webSwarm.on('connection', (connection, info) => {
  console.log('Connected to Pear app:', info)
  
  // Handle connection events
  connection.on('data', (data) => {
    console.log('Received from Pear app:', data)
  })
})
```

### Pear Runtime App
```javascript
import Hyperswarm from 'hyperswarm'

// Create a new instance for Pear app
const pearSwarm = new Hyperswarm( options)

// Join the same topic as web apps
const topic = 'my-pear-app-name'
await pearSwarm.join(topic)

// Listen for web app connections
pearSwarm.on('connection', (connection, info) => {
  console.log('Connected to web app:', info)
  
  // Handle connection events
  connection.on('data', (data) => {
    console.log('Received from web app:', data)
  })
})
```

## Advanced Usage Pattern

### Multi-Runtime Peer Discovery and Connection

```javascript
const topic = 'common interest'

// Web app A
const swarmA = new HyperswarmWeb([options])

const discoveryA = swarmA.join(topic, [options])
await discoveryA.refresh({ client, server })

swarmA.on('connection', (socket, peerInfo) => {
  socket.on('data', async (chunk) => {
    // Handle incoming data from peers
    console.log('Received data on Web App A:', chunk)
  })

  socket.once('close', async () => {
    // Handle peer disconnection
    console.log('Connection closed on Web App A')
  })

  socket.once('error', (err) => {
    // Handle connection errors
    console.error('Connection error on Web App A:', err)
  })
})

swarmA.on('update', () => {
  // Handle peer list updates
  console.log('Peer list updated on Web App A')
})

// Web app B (Similar setup to Web App A)
const swarmB = new HyperswarmWeb([options])

const discoveryB = swarmB.join(topic, [options])
await discoveryB.refresh({ client, server })

swarmB.on('connection', (socket, peerInfo) => {
  // Connection handling similar to Web App A
})

swarmB.on('update', () => {
  // Peer list update handling
})

// Pear app C
const swarmC = new Hyperswarm([options])

const discoveryC = swarmC.join(topic, [options])
await discoveryC.refresh({ client, server })

swarmC.on('connection', (socket, peerInfo) => {
  socket.on('data', async (chunk) => {
    // Handle incoming data from peers
    console.log('Received data on Pear App C:', chunk)
  })

  socket.once('close', async () => {
    // Handle peer disconnection
    console.log('Connection closed on Pear App C')
  })

  socket.once('error', (err) => {
    // Handle connection errors
    console.error('Connection error on Pear App C:', err)
  })
})

swarmC.on('update', () => {
  // Handle peer list updates
  console.log('Peer list updated on Pear App C')
})

// Pear app D (Similar setup to Pear App C)
const swarmD = new Hyperswarm([options])

const discoveryD = swarmD.join(topic, [options])
await discoveryD.refresh({ client, server })

swarmD.on('connection', (socket, peerInfo) => {
  // Connection handling similar to Pear App C
})

swarmD.on('update', () => {
  // Peer list update handling
})

### Key Concepts

- **Common Topic**: All apps join the same topic for peer discovery
- **Runtime Agnostic**: Works across web and Pear runtime environments
- **Flexible Connection Handling**: 
  - `connection` event for new peer connections
  - `update` event for peer list changes
  - Error and close event handlers

### Connection Lifecycle

1. Join a common topic
2. Refresh discovery (optional client/server modes)
3. Listen for connections
4. Handle data, errors, and disconnections
5. Respond to peer list updates

## API

### `new HyperswarmWeb(options)`

Creates a swarm instance for either web or Pear runtime apps.

Options:
- `maxPeers`: Maximum number of peers (default: 24)
- `keyPair`: Custom key pair for DHT (optional)
- `bootstrap`: Array of bootstrap servers (optional)

### `swarm.join(topic, options)`

Joins a topic in the DHT network to discover peers.

- `topic`: String or Buffer representing the topic
- `options`:
  - `announce`: Boolean to control topic announcement (default: true)
  - `lookup`: Boolean to control topic lookup (default: true)

### `swarm.leave(topic)`

Leaves a previously joined topic.

### `swarm.destroy()`

Cleans up and destroys the swarm instance.

## Events

- `connection`: Emitted when a new peer connection is established between web and Pear apps
- `peer`: Emitted when a new peer is discovered in the network
- `close`: Emitted when a peer connection is closed

## Use Cases

- Real-time collaboration between web and Pear apps
- Decentralized data sharing
- P2P communication channels
- Distributed applications spanning web and Pear runtime environments

## License

MIT
