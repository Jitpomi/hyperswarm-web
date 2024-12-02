import { EventEmitter } from 'events';
import DHT from '@hyperswarm/dht';
import b4a from 'b4a';

class HyperswarmWeb extends EventEmitter {
  constructor (opts = {}) {
    super();
    this.opts = {
      bootstrap: opts.bootstrap || [
        'wss://bootstrap1.hyperdht.org',
        'wss://bootstrap2.hyperdht.org',
        'wss://bootstrap3.hyperdht.org'
      ],
      maxPeers: opts.maxPeers || 24,
      keyPair: opts.keyPair || DHT.keyPair()
    };

    this.peers = new Map();
    this.topics = new Map();
    this.discoveries = new Map();
    this.connections = new Set();
    this.destroyed = false;
    this.dht = null;
  }

  normalizeTopic(topic) {
    if (!topic) throw new Error('Topic cannot be null or undefined')
    if (typeof topic === 'string' && !topic.trim()) throw new Error('Topic cannot be empty')
    return typeof topic === 'string' ? b4a.from(topic) : topic
  }

  async initDHT() {
    if (this.destroyed) throw new Error('Cannot initialize DHT on destroyed swarm')
    if (this.dht) return this.dht

    this.dht = new DHT({
      bootstrap: [
        { host: 'bootstrap1.hyperdht.org', port: 49737 },
        { host: 'bootstrap2.hyperdht.org', port: 49737 },
        { host: 'bootstrap3.hyperdht.org', port: 49737 }
      ],
      keyPair: this.opts.keyPair
    });

    await this.dht.ready();
    return this.dht
  }

  async join(topic, opts = {}) {
    if (this.destroyed) throw new Error('Cannot join topic on destroyed swarm')
    if (this.peers.size >= this.opts.maxPeers) throw new Error(`Exceeded maximum peer limit of ${this.opts.maxPeers}`)

    const normalizedTopic = this.normalizeTopic(topic);
    const topicKey = b4a.toString(normalizedTopic, 'hex');

    const discovery = {
      announce: opts.announce !== false,
      lookup: opts.lookup !== false,
      topic: normalizedTopic
    };

    this.discoveries.set(topicKey, discovery);
    this.topics.set(topicKey, normalizedTopic);

    await this.initDHT();
    await this.dht.join(normalizedTopic);

    return discovery
  }

  async leave(topic) {
    const normalizedTopic = this.normalizeTopic(topic);
    const topicKey = b4a.toString(normalizedTopic, 'hex');
    const discovery = this.discoveries.get(topicKey);
    
    if (discovery) {
      await this.dht?.leave(normalizedTopic);
      this.discoveries.delete(topicKey);
      this.topics.delete(topicKey);
    }
  }

  async destroy() {
    if (this.destroyed) return
    this.destroyed = true;

    for (const [_, discovery] of this.discoveries) {
      await this.leave(discovery.topic);
    }

    if (this.dht) {
      await this.dht.destroy();
      this.dht = null;
    }

    this.peers.clear();
    this.topics.clear();
    this.discoveries.clear();
    this.connections.clear();
  }
}

export { HyperswarmWeb as default };
//# sourceMappingURL=hyperswarm-web.js.map
