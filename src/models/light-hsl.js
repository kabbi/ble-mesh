const jBinary = require('jbinary');

exports.messages = {
  0x826d: 'LightHSLGet',
  0x826e: 'LightHSLHueGet',
  0x826f: 'LightHSLHueSet',
  0x8270: 'LightHSLHueSetUnacknowledged',
  0x8271: 'LightHSLHueStatus',
  0x8272: 'LightHSLSaturationGet',
  0x8273: 'LightHSLSaturationSet',
  0x8274: 'LightHSLSaturationSetUnacknowledged',
  0x8275: 'LightHSLSaturationStatus',
  0x8276: 'LightHSLSet',
  0x8277: 'LightHSLSetUnacknowledged',
  0x8278: 'LightHSLStatus',
  0x8279: 'LightHSLTargetGet',
  0x827a: 'LightHSLTargetStatus',
  0x827b: 'LightHSLDefaultGet',
  0x827c: 'LightHSLDefaultStatus',
  0x827d: 'LightHSLRangeGet',
  0x827e: 'LightHSLRangeStatus',
};

exports.typeSet = {
  LightHSLGet: {},
  LightHSLHueGet: {},
  LightHSLHueSet: {
    hue: 'uint16',
    transactionId: 'uint8',
  },
  LightHSLHueSetUnacknowledged: {
    hue: 'uint16',
    transactionId: 'uint8',
  },
  LightHSLSaturationGet: {},
  LightHSLSaturationSet: {
    saturation: 'uint16',
    transactionId: 'uint8',
  },
  LightHSLSaturationSetUnacknowledged: {
    saturation: 'uint16',
    transactionId: 'uint8',
  },
  LightHSLSaturationStatus: {
    saturation: 'uint16',
  },
  LightHSLSet: {
    lightness: 'uint16',
    hue: 'uint16',
    saturation: 'uint16',
    transactionId: 'uint8',
  },
  LightHSLSetUnacknowledged: {
    lightness: 'uint16',
    hue: 'uint16',
    saturation: 'uint16',
    transactionId: 'uint8',
  },
  LightHSLStatus: {
    lightness: 'uint16',
    hue: 'uint16',
    saturation: 'uint16',
  },
};
