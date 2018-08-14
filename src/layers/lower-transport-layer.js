// @flow

const debug = require('debug')('app:layers:lower');

const Keychain = require('../keychain');
const binary = require('../utils/binary');
const packetTypeSet = require('../packets');
const EventEmitter = require('../utils/event-emitter');
const { deriveKeyID, primitives } = require('../utils/mesh-crypto');

import type {
  NetworkPDU,
  NetworkMeta,
  AccessLowerTransportPDU,
  ControlLowerTransportPDU,
  SegmentedLowerTransportPDU,
} from '../packet-types';

import type {
  NetworkMessage,
  LowerTransportMessage,
  Metadata,
} from '../message-types';
import type { AppKey } from '../keychain';

const { parse, write } = binary(packetTypeSet);

type Events = {
  incoming: [LowerTransportMessage],
  outgoing: [NetworkMessage],
};

class LowerTransportLayer extends EventEmitter<Events> {
  keychain: Keychain;

  ivIndex: number;
  seq: number;

  receivedSegments: {
    [seqAuth: number]: {
      longMic: boolean,
      meta: NetworkMeta,
      parts: Buffer[],
    },
  };

  constructor(keychain: Keychain) {
    super();
    this.keychain = keychain;
    this.receivedSegments = {};
    this.ivIndex = 0;
    this.seq = 0;
  }

  nextSeq() {
    const seq = this.seq;
    this.seq += 1;
    return seq;
  }

  handleIncoming(message: NetworkMessage) {
    const { meta, payload } = message;
    debug('handling incoming message %h', message.payload);
    if (message.meta.type === 'control') {
      const pdu: ControlLowerTransportPDU = parse(
        'ControlLowerTransportPDU',
        payload,
      );
      if (pdu.segmented) {
        this.handleIncomingSegment(meta, false, pdu);
      } else {
        this.handleIncomingControl(meta, pdu);
      }
    } else {
      const pdu: AccessLowerTransportPDU = parse(
        'AccessLowerTransportPDU',
        payload,
      );
      if (pdu.segmented) {
        this.handleIncomingSegment(meta, pdu.longMIC, pdu);
      } else {
        this.handleIncomingAccess(meta, pdu);
      }
    }
  }

  handleOutgoing(message: LowerTransportMessage) {
    if (message.type === 'control') {
      debug('outgoing control messages is not yet supported');
      return;
    }
    const key = message.appKey
      ? this.keychain.appKeys[message.appKey]
      : this.keychain.deviceKeys[message.meta.to];
    if (!key) {
      debug('dropping outgoing messages no key');
      return;
    }
    const seq = message.meta.seq || this.nextSeq();
    const result = primitives.encrypt(
      key.data,
      write('Nonce', {
        type: message.appKey ? 'Application' : 'Device',
        payload: {
          aszMic: false,
          ivIndex: this.ivIndex,
          src: message.meta.from,
          dst: message.meta.to,
          seq,
        },
      }),
      message.payload,
      4, // FIXME: This works only for unsegmented messages
    );
    const payload = write('AccessLowerTransportPDU', {
      segmented: false,
      appKeyUsed: Boolean(message.appKey),
      appKeyID: message.appKey ? key.id : 0,
      payload: Buffer.concat([result.payload, result.mic]),
    });
    this.emit('outgoing', {
      payload,
      meta: {
        ...message.meta,
        type: 'access',
        seq,
      },
    });
  }

  handleIncomingSegment(
    meta: Metadata,
    longMic: boolean,
    message: SegmentedLowerTransportPDU,
  ) {
    const info = this.receivedSegments[message.seqAuth] || {
      parts: Array(message.segmentCount + 1).fill(null),
      longMic,
      meta,
    };
    this.receivedSegments[message.seqAuth] = info;
    if (message.segmentOffset >= info.parts.length) {
      debug(
        'dropping segment with index out of bounds %d',
        message.segmentOffset,
        info.parts.length,
      );
      return;
    }
    if (info.parts[message.segmentOffset]) {
      debug('dropping segment already received', message.segmentOffset);
      return;
    }
    info.parts[message.segmentOffset] = message.payload;
    if (!info.parts.every(Boolean)) {
      return;
    }
    // TODO: Send acks more often
    this.emit('outgoing', {
      meta: {
        ...meta,
        from: meta.to,
        to: meta.from,
        type: 'control',
      },
      payload: write('ControlLowerTransportPDU', {
        segmented: false,
        opcode: 0,
        payload: write('SegmentAcknowledgement', {
          byFriendlyNode: false,
          seqAuth: 0, // FIXME: What to write here?
          blockAck: (1 << info.parts.length) - 1,
        }),
      }),
    });
    const payload = Buffer.concat(info.parts);
    if (meta.type === 'control') {
      // $FlowFixMe how do we generalize segmented types?
      this.handleIncomingControl(info.meta, {
        ...message,
        payload,
      });
    } else {
      // $FlowFixMe how do we generalize segmented types?
      this.handleIncomingAccess(info.meta, {
        ...message,
        payload,
      });
    }
  }

  handleIncomingAccess(meta: Metadata, message: AccessLowerTransportPDU) {
    const deviceKey = this.keychain.deviceKeys[meta.to];
    const appKey: ?AppKey = message.appKeyUsed
      ? this.keychain.getAppKeyByID(message.appKeyID)
      : null;
    if (message.appKeyUsed && !appKey) {
      debug('dropping message with no app key %d', message.appKeyID);
      return;
    }
    if (!message.appKeyUsed && !deviceKey) {
      debug('dropping message with no device key %d', meta.to);
      return;
    }
    const micLength = message.segmented && message.longMIC ? 8 : 4;
    const payload = primitives.decrypt(
      appKey ? appKey.data : deviceKey.data,
      write('Nonce', {
        type: message.appKeyUsed ? 'Application' : 'Device',
        payload: {
          aszMic: message.segmented && message.longMIC,
          ivIndex: this.ivIndex,
          seq: meta.seq,
          src: meta.from,
          dst: meta.to,
        },
      }),
      message.payload.slice(0, -micLength),
      message.payload.slice(-micLength),
    );
    if (!payload) {
      debug('dropping message cannot decrypt');
      return;
    }
    this.emit('incoming', {
      appKey: appKey ? appKey.alias : undefined,
      type: 'access',
      payload,
      meta,
    });
  }

  handleIncomingControl(meta: Metadata, message: ControlLowerTransportPDU) {
    if (message.opcode !== 0) {
      debug('dropping control message with unsupported opcode', message.opcode);
      return;
    }
    // TODO: Handle segment ack
  }
}

module.exports = LowerTransportLayer;
