const jBinary = require('jbinary');

exports.messages = {
  0x8205: 'GenericLevelGet',
  0x8206: 'GenericLevelSet',
  0x8207: 'GenericLevelSetUnacknowledged',
  0x8208: 'GenericLevelStatus',
};

exports.typeSet = {
  GenericLevelGet: {},
  GenericLevelSet: {
    level: 'int16',
    transactionId: 'uint8',
  },
  GenericLevelSetUnacknowledged: {
    level: 'int16',
    transactionId: 'uint8',
  },
  GenericLevelStatus: {
    level: 'int16',
  },
};
