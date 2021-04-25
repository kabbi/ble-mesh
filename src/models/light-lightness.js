const jBinary = require('jbinary');

exports.messages = {
  0x824e: 'LightLightnessStatus',
  0x824c: 'LightLightnessSet',
  0x824d: 'LightLightnessSetUnacknowledged',
};

exports.typeSet = {
  LightLightnessStatus: {
    lightness: 'uint16',
  },
  LightLightnessSet: {
    lightness: 'uint16',
    transactionId: 'uint8',
  },
  LightLightnessSetUnacknowledged: {
    lightness: 'uint16',
    transactionId: 'uint8',
  },
};