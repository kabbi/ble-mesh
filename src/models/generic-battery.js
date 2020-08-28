const jBinary = require('jbinary');

exports.messages = {
  0x8224: 'GenericBatteryStatus',
};

exports.typeSet = {
  GenericBatteryStatus: {
    batteryLevel: 'uint8',
    timeToDischarge: 24,
    timeToCharge: 24,
    flags: 'uint8',
  },
};
