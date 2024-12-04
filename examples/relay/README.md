# HyperswarmWeb Relay Server

This is a WebSocket relay server implementation that enables web browsers to connect to the Hyperswarm network. It serves as a bridge between WebSocket connections from browsers and the UDP-based DHT network used by Hyperswarm.

## Features

- WebSocket server with SSL/TLS support
- DHT peer discovery and announcement
- Connection brokering between web and Pear apps
- NAT traversal assistance
- Secure signaling for WebRTC connections

## Setup

1. Generate SSL certificates:
```bash
mkdir certs
openssl req -x509 -newkey rsa:4096 -keyout certs/server.key -out certs/server.crt -days 365 -nodes
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
# Using default port 8443
npm start

# Using custom port and certificate paths
PORT=9443 SSL_KEY_PATH=./custom/server.key SSL_CERT_PATH=./custom/server.crt npm start
```

## How It Works

1. **Web Client Connection**:
   - Web clients connect via WebSocket (WSS)
   - Server assigns unique client ID
   - Client can announce presence and lookup peers

2. **DHT Integration**:
   - Server maintains DHT node
   - Handles peer discovery and announcements
   - Bridges between WebSocket and DHT protocols

3. **Connection Brokering**:
   - Facilitates initial connection setup
   - Handles signaling for WebRTC
   - Assists with NAT traversal

4. **Security**:
   - SSL/TLS encryption for WebSocket connections
   - Public key verification for peer connections
   - Secure signaling channel

## Environment Variables

- `PORT`: Server port (default: 8443)
- `SSL_KEY_PATH`: Path to SSL private key
- `SSL_CERT_PATH`: Path to SSL certificate

## Usage in Examples

The web and Pear examples are configured to use this relay server. Update the bootstrap URLs in the examples to point to your relay server instance:

```javascript
const swarm = new HyperswarmWeb({
    bootstrap: ['wss://your-relay-server:8443']
});
```
