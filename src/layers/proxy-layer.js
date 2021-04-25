const debug = require('debug')('mesh:layers:network');

const Keychain = require('../keychain');
const binary = require('../utils/binary');
const packetTypeSet = require('../packets');
const EventEmitter = require('../utils/event-emitter');
const { obfuscateMeta, primitives } = require('../utils/mesh-crypto');

const { parse, write } = binary(packetTypeSet);

class ProxyLayer extends EventEmitter {
  keychain: Keychain;

  ivIndex: number;
  seq: number;
  sourceAddress: number;

  constructor(keychain: Keychain) {
    super();
    this.keychain = keychain;
    this.sourceAddress = 0x7ff;
    this.ivIndex = 0;
    this.seq = 0;
  }

  getProxyNonce(seq: number) {
    return write('Nonce', {
      type: 'Proxy',
      payload: {
        ivIndex: this.ivIndex,
        src: this.sourceAddress,
        seq,
      },
    });
  }

  nextSeq() {
    const seq = this.seq;
    this.seq += 1;
    return seq;
  }

  handleIncoming(data: Buffer) {
    debug('handling incoming message %h', data);
    const message: ProxyPDU = parse('ProxyPDU', data);
    debug('got incoming message %o', message);
    this.emit('incoming', message);
  }

  handleOutgoing(message: NetworkMessage) {
    debug('handling outgoing message %h', message.payload);
    const networkPayload = Buffer.concat(
      [write('uint16', message.meta.to), message.payload],
      message.payload.length + 2,
    );
    const meta: NetworkMeta = {
      ctl: message.meta.type === 'control',
      seq: message.meta.seq || this.nextSeq(),
      ttl: message.meta.ttl || 100,
      src: message.meta.from,
      dst: message.meta.to,
    };
    const firstKey = this.keychain.networkKeys[0];
    const { payload, mic } = primitives.encrypt(
      firstKey.encryptionKey,
      message.nonce || this.getProxyNonce(meta),
      networkPayload,
      meta.ctl ? 8 : 4,
    );
    const encryptedPart = Buffer.concat([payload, mic]);
    const obfuscatedPart = write('NetworkMeta', meta);
    const pdu = obfuscateMeta(firstKey.privacyKey, this.ivIndex, {
      nid: firstKey.nid,
      ivi: this.ivIndex & 1,
      obfuscatedPart,
      encryptedPart,
    });
    this.emit('outgoing', write('NetworkPDU', pdu));
  }
}

module.exports = NetworkLayer;
