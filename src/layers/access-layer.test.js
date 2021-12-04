const AccessLayer = require('./access-layer');
const createBinary = require('../utils/binary');
const { hex } = require('../utils/tags');
const Keychain = require('../keychain');
const typeSet = require('../packets');

const { parse, write } = createBinary(typeSet);

describe('access-layer', () => {
  it('decrypts simplest gen-onoff message', () => {
    const layer = new AccessLayer();
    const listener = jest.fn();
    layer.on('incoming', listener);

    layer.handleIncoming({
      opcode: 0x8202,
      payload: hex`0000`,
    });
    expect(listener).toHaveBeenCalledWith({
      type: 'GenericOnOffSet',
      payload: {
        status: 'off',
        transactionId: 0,
      },
      appKey: undefined,
      meta: undefined,
    });
  });

  it('allow extending supported models', () => {
    const layer = new AccessLayer();
    const listener = jest.fn();
    layer.on('incoming', listener);

    layer.registerModel({
      messages: {
        0x123456: 'ExtendedModelTest',
      },
      typeSet: {
        ExtendedModelTest: {
          value: 'uint16',
        },
      },
    });

    layer.handleIncoming({
      opcode: 0x123456,
      payload: hex`3412`,
    });
    expect(listener).toHaveBeenCalledWith({
      type: 'ExtendedModelTest',
      payload: {
        value: 0x1234,
      },
      appKey: undefined,
      meta: undefined,
    });
  });
});
