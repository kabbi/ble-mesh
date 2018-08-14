// @flow

const LowerTransportLayer = require('./lower-transport-layer');
const { hex } = require('../utils/tags');
const Keychain = require('../keychain');

describe('lower-transport-layer', () => {
  const keychain = new Keychain();
  keychain.addAppKey('test', hex`63964771734fbd76e3b40519d1d94a48`);
  keychain.addDeviceKey(0x1, hex`3A9FE13D360DB3E5F32E06DD771DB6DD`);
  keychain.addDeviceKey(0x7ff, hex`3A9FE13D360DB3E5F32E06DD771DB6DD`);

  it('receives unsegmented access message', () => {
    const layer = new LowerTransportLayer(keychain);
    const listener = jest.fn();
    layer.on('incoming', listener);
    layer.handleIncoming({
      meta: { ttl: 100, seq: 1, from: 0x7ff, to: 1, type: 'access' },
      payload: hex`002a00f26542eb68`,
    });
    expect(listener).toHaveBeenCalledWith({
      meta: { ttl: 100, seq: 1, from: 0x7ff, to: 1, type: 'access' },
      payload: hex`8008FF`,
      type: 'access',
    });
  });

  it('receives segmented access message', () => {
    const layer = new LowerTransportLayer(keychain);
    const inListener = jest.fn();
    const outListener = jest.fn();
    layer.on('incoming', inListener);
    layer.on('outgoing', outListener);
    layer.handleIncoming({
      meta: { ttl: 7, seq: 0, from: 1, to: 0x7ff, type: 'access' },
      payload: hex`8080000240e94b96824bbc07013b2ef5`,
    });
    layer.handleIncoming({
      meta: { ttl: 7, seq: 1, from: 1, to: 0x7ff, type: 'access' },
      payload: hex`80800022d1e6f162b631f5968a41660e`,
    });
    layer.handleIncoming({
      meta: { ttl: 7, seq: 2, from: 1, to: 0x7ff, type: 'access' },
      payload: hex`808000425059391cedffcbd2346e6803`,
    });
    // Reassembled message
    expect(inListener).toHaveBeenCalledWith({
      meta: { from: 1, to: 0x7ff, seq: 0, ttl: 7, type: 'access' },
      payload: hex`0200c305000000000a000600000004010000020000100210c3050010`,
      type: 'access',
    });
    // Segment ack message
    expect(outListener).toHaveBeenCalledWith({
      meta: { ttl: 7, seq: 2, from: 0x7ff, to: 1, type: 'control' },
      payload: hex`00000000000007`,
    });
  });
});
