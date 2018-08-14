const jBinary = require('jbinary');

const FeatureFlags = {
  Relay: 1 << 0,
  Proxy: 1 << 1,
  Friend: 1 << 2,
  LowPower: 1 << 3,
};

exports.messages = {
  0x00: 'ConfigAppKeyAdd',
  0x02: 'ConfigCompositionDataStatus',
  0x8003: 'ConfigAppKeyStatus',
  0x8008: 'ConfigCompositionDataGet',
  0x803d: 'ConfigModelAppBind',
  0x803e: 'ConfigModelAppStatus',
};

exports.typeSet = {
  CompositionData: {
    CID: 'uint16',
    PID: 'uint16',
    VID: 'uint16',
    CRPL: 'uint16',
    features: ['BitFlags', 'uint16', FeatureFlags],
    elements: ['array', 'Element'],
  },
  Element: {
    locationDescriptor: 'uint16',
    sigModelIDsCount: 'uint8',
    vendorModelIDsCount: 'uint8',
    sigModelIDs: ['array', 'uint16', 'sigModelIDsCount'],
    vendorModelIDs: ['array', 'uint32', 'vendorModelIDsCount'],
  },

  ConfigAppKeyAdd: {
    netKeyAppKeyIndex: 24,
    appKey: ['blob', 16],
  },
  ConfigAppKeyBind: {
    netKeyAppKeyIndex: 24,
    appKey: ['blob', 16],
  },
  ConfigAppKeyStatus: {
    status: 'uint8',
    netKeyAppKeyIndex: 24,
  },
  ConfigCompositionDataGet: {
    page: 'uint8',
  },
  ConfigCompositionDataStatus: {
    page: 'uint8',
    data: 'CompositionData',
  },
  ConfigModelAppBind: {
    elementAddr: 'uint16',
    appKeyIndex: 'uint16',
    modelId: 'VarInt',
  },
  ConfigModelAppStatus: {
    status: 'uint8',
    elementAddr: 'uint16',
    appKeyIndex: 'uint16',
    modelId: 'VarInt',
  },
};
