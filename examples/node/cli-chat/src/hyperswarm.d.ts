declare module 'hyperswarm' {
    import { EventEmitter } from 'events';
    import { Socket } from 'net';

    interface HyperswarmOptions {
        maxPeers?: number;
        maxClientConnections?: number;
        maxServerConnections?: number;
        firewall?: (remotePublicKey: Buffer) => boolean | Promise<boolean>;
    }

    class Hyperswarm extends EventEmitter {
        constructor(options?: HyperswarmOptions);
        
        join(topic: Buffer, options?: { server?: boolean; client?: boolean }): Promise<void>;
        leave(topic: Buffer): Promise<void>;
        destroy(): Promise<void>;
        
        on(event: 'connection', listener: (socket: Socket, info: { publicKey: Buffer }) => void): this;
        on(event: string, listener: Function): this;
    }

    export default Hyperswarm;
}
