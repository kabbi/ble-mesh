const debug = require('debug')('mesh:layers:upper');

const binary = require('../utils/binary');
const packetTypeSet = require('../packets');
const EventEmitter = require('../utils/event-emitter');

const { parse, write } = binary(packetTypeSet);

class UpperTransportLayer extends EventEmitter {
  handleIncoming(message) {
    debug('handling incoming message %o', message);

    if (message.payload.length === 0) {
      debug('dropping empty message');
      return;
    }

    if (message.type === 'control') {
      debug('upper control messages are unsupported');
      return;
    }

    let opcode = 0;
    let opcodeLength = 0;
    const firstByte = message.payload[0];
    if ((firstByte & 0xc0) === 0xc0) {
      opcode = parse(24, message.payload);
      opcodeLength = 3;
    } else if (firstByte & 0x80) {
      opcode = parse('uint16', message.payload);
      opcodeLength = 2;
    } else {
      opcode = parse('uint8', message.payload);
      opcodeLength = 1;
    }

    this.emit('incoming', {
      payload: message.payload.slice(opcodeLength),
      appKey: message.appKey,
      meta: message.meta,
      opcode,
    });
  }

  handleOutgoing(message) {
    debug('handling outgoing message %o', message);

    let payload = message.payload;
    const { opcode } = message;
    if (opcode > 0xffff) {
      payload = Buffer.concat([write(24, opcode), message.payload]);
    } else if (message.opcode > 0xff) {
      payload = Buffer.concat([write('uint16', opcode), message.payload]);
    } else {
      payload = Buffer.concat([write('uint8', opcode), message.payload]);
    }

    this.emit('outgoing', {
      appKey: message.appKey,
      meta: message.meta,
      payload: payload,
      type: 'access',
    });
  }
}

module.exports = UpperTransportLayer;
