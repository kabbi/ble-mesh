const jBinary = require('jbinary');

exports.messages = {
  0x824E: 'LightLightnessStatus',
};

exports.typeSet = {
  LightLightnessStatus: {
    presentLightness: 'uint16',
  },
};
