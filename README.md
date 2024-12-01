# HyperswarmWeb

A lightweight, flexible peer-to-peer networking library for web applications using Hyperswarm technologies.

## Features

- **Flexible Topic Handling**: Support for multiple topic input types (string, Buffer, Uint8Array)
- **Robust DHT Integration**: Seamless integration with Hyperswarm DHT
- **Lightweight Peer Discovery**: Efficient peer connection and discovery mechanisms
- **Cross-Platform Compatibility**: Works in Node.js and web browsers
- **Minimal Configuration**: Easy to set up and use

## Installation

```bash
npm install hyperswarm-web
```

## Key Improvements in v3.0.0

### Topic Handling
- Enhanced topic conversion logic
- Supports multiple input types (string, Buffer, Uint8Array)
- Improved type conversion and hashing mechanisms

### DHT Initialization
- Flexible DHT node initialization
- Support for direct DHT node assignment in testing scenarios
- Improved error handling during DHT setup

### Connection Management
- More robust error handling
- Flexible connection methods
- Added logging for connection failures

## Dependencies

- `@hyperswarm/dht`: Core DHT functionality
- `simple-peer-light`: Lightweight WebRTC peer connections
- `b4a`: Buffer abstraction library

## Testing

Comprehensive test suite covering:
- Basic initialization
- DHT integration
- Topic handling
- Peer discovery and connection

## Security

- Secure peer discovery via DHT
- Supports ephemeral connections
- Basic firewall mechanism

## Usage Example

```javascript
const HyperswarmWeb = require('hyperswarm-web')

// Create a new swarm
const swarm = new HyperswarmWeb()

// Join a topic
const discovery = await swarm.join('my-cool-topic')

// Handle peer connections
discovery.on('connection', (connection) => {
  // Peer connection established
})
```

## Environment Support

- Node.js compatible
- Web browser support (with limitations)
- Server and client-side usage

## Roadmap

- Improve WebRTC signaling
- Add more comprehensive error logging
- Enhance documentation
- Develop more complex connection scenarios

## Contributing

Contributions are welcome! Please check our issues page for current tasks and improvements.

## License

MIT License
