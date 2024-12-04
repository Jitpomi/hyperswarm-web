import { WebSocketServer } from 'ws';
import { createServer } from 'https';
import HyperswarmWeb from '../../src/index.js';

const port = process.env.PORT || 3400;
const swarm = new HyperswarmWeb();
        // Load SSL certificates
        const ssl = {
            key: readFileSync(options.keyPath || './certs/server.key'),
            cert: readFileSync(options.certPath || './certs/server.crt')
        };

        // Create HTTPS server
        const server = createServer(ssl);
        
        // Create WebSocket server


const wss = new WebSocketServer({server})

wss.on('connection', function (ws) {
    swarm.relay(ws)
})

server.listen(port, function (){
  console.log(`Listening at: ws://localhost:${port}`);
})
