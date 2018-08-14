// @flow

const UpperTransportLayer = require('./upper-transport-layer');
const { hex } = require('../utils/tags');

const DefaultMeta = { type: 'access', to: 0, from: 0, ttl: 0, seq: 0 };

describe('upper-transport-layer', () => {
  it('parses 1-byte opcode', () => {
    const layer = new UpperTransportLayer();
    const listener = jest.fn();
    layer.on('incoming', listener);
    layer.handleIncoming({
      meta: DefaultMeta,
      type: 'access',
      payload: hex`00112233`,
    });
    expect(listener).toHaveBeenCalledWith({
      meta: DefaultMeta,
      payload: hex`112233`,
      opcode: 0,
    });
  });

  it('parses 2-byte opcode', () => {
    const layer = new UpperTransportLayer();
    const listener = jest.fn();
    layer.on('incoming', listener);
    layer.handleIncoming({
      meta: DefaultMeta,
      type: 'access',
      payload: hex`8008112233`,
    });
    expect(listener).toHaveBeenCalledWith({
      meta: DefaultMeta,
      payload: hex`112233`,
      opcode: 0x8008,
    });
  });

  it('parses 3-byte opcode', () => {
    const layer = new UpperTransportLayer();
    const listener = jest.fn();
    layer.on('incoming', listener);
    layer.handleIncoming({
      meta: DefaultMeta,
      type: 'access',
      payload: hex`CFAABB112233`,
    });
    expect(listener).toHaveBeenCalledWith({
      meta: DefaultMeta,
      payload: hex`112233`,
      opcode: 0xcfaabb,
    });
  });
});
