import Hyperswarm from 'hyperswarm';
import crypto from 'crypto';
import chalk from 'chalk';
import readline from 'readline';
import { Socket } from 'net';

// Types
interface PeerInfo {
    type: string;
    client: string;
    version: string;
    id: string;
    capabilities: string[];
}

interface Peer {
    connection: Socket;
    info: PeerInfo | null;
    connectionType: 'direct' | 'relay';
}

interface Message {
    type: string;
    from?: PeerInfo;
    content?: string;
    timestamp?: number;
    info?: PeerInfo;
    direct?: boolean;
}

// Message types
const MESSAGE_TYPES = {
    CHAT: 'chat',
    PEER_INFO: 'peer_info',
    CONNECTION_TYPE: 'connection_type',
    CAPABILITIES: 'capabilities'
} as const;

// Initialize swarm
const swarm = new Hyperswarm();

// Set peer info
const clientId = crypto.randomBytes(4).toString('hex');
const peerInfo: PeerInfo = {
    type: 'pear-cli',
    client: 'chat-example',
    version: '1.0.0',
    id: clientId,
    capabilities: ['text-chat', 'ansi-colors']
};

// Track peers
const peers = new Map<string, Peer>();

// Generate topic for the chat room
const topic = crypto.createHash('sha256')
    .update('hyperswarm-web-chat-example')
    .digest();

// Setup readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Display connected peers
function updatePeerList(): void {
    console.clear();
    console.log(chalk.cyan('\nConnected Peers:'));
    peers.forEach((peer, id) => {
        const type = peer.info?.type || 'unknown';
        const connection = peer.connectionType === 'direct' ?
            chalk.green('direct') :
            chalk.yellow('relay');
        console.log(`${id} | ${type} | ${connection}`);
    });
    console.log('\n');
}

// Join the swarm and handle connection lifecycle
async function main() {
    try {
        console.log(chalk.yellow('Searching for peers...'));
        await swarm.join(topic);
        console.log(chalk.green('Connected to network'));
        console.log(chalk.blue(`Your ID: ${clientId}`));
        console.log(chalk.yellow('Waiting for peers to connect...\n'));
    } catch (err) {
        if (err instanceof Error) {
            console.error(chalk.red('Failed to connect:', err.message));
        }
        process.exit(1);
    }

    // Handle new peer connections
    swarm.on('connection', (connection: Socket, info: { publicKey: Buffer }) => {
        const peerId = info.publicKey.toString('hex').slice(0, 8);
        console.log(chalk.green(`\nNew peer connected!`));

        // Initialize peer tracking
        peers.set(peerId, {
            connection,
            info: null,
            connectionType: 'relay' // Start with relay, will update if direct
        });

        updatePeerList();

        // Send our peer info
        const message: Message = {
            type: MESSAGE_TYPES.PEER_INFO,
            info: peerInfo
        };
        connection.write(JSON.stringify(message));

        // Remove existing listeners to prevent duplicates
        connection.removeAllListeners('data');

        // Handle incoming messages
        connection.on('data', (data: Buffer) => {
            try {
                const message: Message = JSON.parse(data.toString());
                switch (message.type) {
                    case MESSAGE_TYPES.CHAT:
                        if (message.from && message.from.id !== clientId) {
                            const platform = message.from.type;
                            console.log(`${message.from.id}(${platform}): ${message.content}`);
                        }
                        break;

                    case MESSAGE_TYPES.PEER_INFO:
                        const peer = peers.get(peerId);
                        if (peer && message.info) {
                            peer.info = message.info;
                            updatePeerList();
                        }
                        break;

                    case MESSAGE_TYPES.CONNECTION_TYPE:
                        const peerConn = peers.get(peerId);
                        if (peerConn && typeof message.direct === 'boolean') {
                            peerConn.connectionType = message.direct ? 'direct' : 'relay';
                            updatePeerList();
                            console.log(chalk.yellow(
                                `Connection to ${peerId} is now ${message.direct ? 'direct P2P' : 'via relay'}`
                            ));
                        }
                        break;
                }
            } catch (err) {
                console.error('Failed to parse message:', err);
            }
        });

        // Monitor connection type changes
        connection.on('holepunch', (info: { success: boolean }) => {
            if (info.success) {
                const message: Message = {
                    type: MESSAGE_TYPES.CONNECTION_TYPE,
                    direct: true
                };
                connection.write(JSON.stringify(message));
            }
        });

        // Handle connection errors
        connection.on('error', (err: Error) => {
            console.error(chalk.red(`Connection error with ${peerId}:`, err.message));
            peers.delete(peerId);
            updatePeerList();
        });

        // Handle connection close
        connection.on('close', () => {
            console.log(chalk.yellow(`Disconnected from peer: ${peerId}`));
            peers.delete(peerId);
            updatePeerList();
        });
    });

    // Handle user input
    rl.on('line', (line: string) => {
        // Display local message
        console.log(`me(cli): ${line}`);

        const message: Message = {
            type: MESSAGE_TYPES.CHAT,
            from: peerInfo,
            content: line,
            timestamp: Date.now()
        };

        // Send to all peers
        for (const [, peer] of peers) {
            peer.connection.write(JSON.stringify(message));
        }
    });

    // Cleanup on exit
    process.on('SIGINT', async () => {
        console.log(chalk.yellow('\nDisconnecting from network...'));
        await swarm.leave(topic);
        await swarm.destroy();
        rl.close();
        process.exit(0);
    });
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
