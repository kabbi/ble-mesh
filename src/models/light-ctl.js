const jBinary = require('jbinary');

exports.messages = {
  0x8266: 'LightCTLTemperatureStatus',
};

exports.typeSet = {
  LightCTLTemperatureStatus: {
    presentTemperature: 'uint16',
    presentDeltaUV: 'uint16',
  },
};
