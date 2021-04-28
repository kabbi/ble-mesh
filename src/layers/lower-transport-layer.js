const debug = require('debug')('mesh:layers:lower');

const binary = require('../utils/binary');
const packetTypeSet = require('../packets');
const { nextSeq } = require('../utils/seq-provider');
const EventEmitter = require('../utils/event-emitter');
const { primitives } = require('../utils/mesh-crypto');

const { parse, write } = binary(packetTypeSet);

class LowerTransportLayer extends EventEmitter {
  constructor(keychain) {
    super();
    this.keychain = keychain;
    this.receivedSegments = {};
    this.ivIndex = 0;
  }

  handleIncoming(message) {
    const { meta, payload } = message;
    debug('handling incoming message %h', message.payload);
    if (message.meta.type === 'control') {
      const pdu = parse('ControlLowerTransportPDU', payload);
      if (pdu.segmented) {
        this.handleIncomingSegment(meta, false, pdu);
      } else {
        this.handleIncomingControl(meta, pdu);
      }
    } else {
      const pdu = parse('AccessLowerTransportPDU', payload);
      if (pdu.segmented) {
        this.handleIncomingSegment(meta, pdu.longMIC, pdu);
      } else {
        this.handleIncomingAccess(meta, pdu);
      }
    }
  }

  handleOutgoing(message) {
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
    const seq =
      message.meta.seq ||
      nextSeq(message.meta.from.toString(16).padStart(4, '0'));
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

  handleIncomingSegment(meta, longMic, message) {
    debug('handling incoming segment %o', message);
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
          seqAuth: message.seqAuth,
          blockAck: (1 << info.parts.length) - 1,
        }),
      }),
    });
    const payload = Buffer.concat(info.parts);
    if (meta.type === 'control') {
      this.handleIncomingControl(info.meta, {
        ...message,
        payload,
      });
    } else {
      this.handleIncomingAccess(info.meta, {
        ...message,
        payload,
      });
    }
  }

  handleIncomingAccess(meta, message) {
    const deviceKey =
      this.keychain.deviceKeys[meta.from] || this.keychain.deviceKeys[meta.to];
    const appKey = message.appKeyUsed
      ? this.keychain.getAppKeyByID(message.appKeyID)
      : null;
    if (message.appKeyUsed && !appKey) {
      debug('dropping message with no app key %d', message.appKeyID);
      return;
    }
    if (!message.appKeyUsed && !deviceKey) {
      debug('dropping message with no device key %d', meta.from);
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

  handleIncomingControl(meta, message) {
    // TODO: Pass other-than-zero opcode messages to upper transport layer
    if (message.opcode === 0x0a) {
      debug('got heartbeat', parse('Heartbeat', message.payload));
      return;
    }

    if (message.opcode !== 0) {
      debug('dropping control message with unsupported opcode', message.opcode);
      return;
    }

    // TODO: Handle segment ack
  }
}

module.exports = LowerTransportLayer;
