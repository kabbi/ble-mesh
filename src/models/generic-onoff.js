const jBinary = require('jbinary');

const OnOrOff = {
  0: 'off',
  1: 'on',
};

exports.messages = {
  0x8201: 'GenericOnOffGet',
  0x8202: 'GenericOnOffSet',
  0x8203: 'GenericOnOffSetUnacknowledged',
  0x8204: 'GenericOnOffStatus',
};

exports.typeSet = {
  GenericOnOffGet: {},
  GenericOnOffSet: {
    status: ['enum', 'uint8', OnOrOff],
    transactionId: 'uint8',
  },
  GenericOnOffSetUnacknowledged: 'GenericOnOffSet',
  GenericOnOffStatus: {
    currentStatus: ['enum', 'uint8', OnOrOff],
  },
};
