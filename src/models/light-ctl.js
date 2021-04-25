const jBinary = require('jbinary');

exports.messages = {
  0x8265: 'LightCTLTemperatureSetUnacknowledged',
  0x8266: 'LightCTLTemperatureStatus',
};

exports.typeSet = {
  LightCTLTemperatureSetUnacknowledged: {
    temperature: 'uint16',
    deltaUV: 'uint16',
    transactionId: 'uint8',
  },
  LightCTLTemperatureStatus: {
    temperature: 'uint16',
    deltaUV: 'uint16',
  },
};
