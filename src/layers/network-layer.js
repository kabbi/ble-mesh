// @flow

const debug = require('debug')('app:layers:network');

const Keychain = require('../keychain');
const binary = require('../utils/binary');
const packetTypeSet = require('../packets');
const EventEmitter = require('../utils/event-emitter');
const {
  deriveNetworkID,
  deriveNetworkKeys,
  deobfuscateMeta,
  obfuscateMeta,
  primitives,
} = require('../utils/mesh-crypto');

import type { NetworkPDU, NetworkMeta } from '../packet-types';
import type { NetworkMessage } from '../message-types';
import type { NetworkKey } from '../keychain';

const { parse, write } = binary(packetTypeSet);

type Events = {
  incoming: [NetworkMessage],
  outgoing: [Buffer],
};

class NetworkLayer extends EventEmitter<Events> {
  keychain: Keychain;

  ivIndex: number;
  seq: number;

  constructor(keychain: Keychain) {
    super();
    this.keychain = keychain;
    this.ivIndex = 0;
    this.seq = 0;
  }

  getNetworkNonce(meta: NetworkMeta) {
    return write('Nonce', {
      type: 'Network',
      payload: {
        ivIndex: this.ivIndex,
        ...meta,
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
    let pdu: NetworkPDU;
    try {
      pdu = parse('NetworkPDU', data);
    } catch (error) {
      debug('dropping malformed message %o', error);
      return;
    }
    const key = this.keychain.getNetworkKeyByNID(pdu.nid);
    if (!key) {
      debug('dropping message with wrong nid, %d !== %d', pdu.nid);
      return;
    }
    const meta: NetworkMeta = parse(
      'NetworkMeta',
      deobfuscateMeta(key.privacyKey, this.ivIndex, pdu),
    );
    const micLength = meta.ctl ? 8 : 4;
    const payload = primitives.decrypt(
      key.encryptionKey,
      this.getNetworkNonce(meta),
      pdu.encryptedPart.slice(0, -micLength),
      pdu.encryptedPart.slice(-micLength),
    );
    if (!payload) {
      debug('dropping message cannot decrypt');
      return;
    }
    meta.dst = parse('uint16', payload);
    const networkPayload = payload.slice(2);
    debug('got incoming message: %O, %h', meta, networkPayload);
    this.emit('incoming', {
      payload: networkPayload,
      meta: {
        type: meta.ctl ? 'control' : 'access',
        from: meta.src,
        to: meta.dst,
        ttl: meta.ttl,
        seq: meta.seq,
      },
    });
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
      this.getNetworkNonce(meta),
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
