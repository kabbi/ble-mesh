const debug = require('debug')('mesh:layers:access');
const invert = require('lodash/invert');

const binary = require('../utils/binary');
const EventEmitter = require('../utils/event-emitter');
const { typeSet, messages } = require('../models');

const { parse, write } = binary(typeSet);

class AccessLayer extends EventEmitter {
  constructor() {
    super();
    this.messagesLookup = invert(messages);
  }

  handleIncoming(message) {
    debug('handling incoming message %o', message);

    const messageType = messages[message.opcode];
    if (!messageType) {
      debug('dropping unsupported opcode %s', message.opcode.toString(16));
      return;
    }

    this.emit('incoming', {
      payload: parse(messageType, message.payload),
      appKey: message.appKey,
      type: messageType,
      meta: message.meta,
    });
  }

  handleOutgoing(message) {
    debug('handling outgoing message %o', message);

    const opcode = this.messagesLookup[message.type];
    if (opcode == null) {
      debug('dropping unsupported type %d', message.type);
      return;
    }

    const payload = write(message.type, message.payload);
    this.emit('outgoing', {
      appKey: message.appKey,
      meta: message.meta,
      opcode: +opcode,
      payload,
    });
  }
}

module.exports = AccessLayer;
