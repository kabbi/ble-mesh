const jBinary = require('jbinary');

const BitFlags = require('../utils/jbinary/bit-flags');
const VarInt = require('../utils/jbinary/var-int');

const Configuration = require('./configuration');
const GenericOnOff = require('./generic-onoff');

exports.messages = {
  ...Configuration.messages,
  ...GenericOnOff.messages,
};

exports.typeSet = {
  'jBinary.littleEndian': true,
  // Common binary helpers
  BitFlags,
  VarInt,
  // Model type definitions
  ...Configuration.typeSet,
  ...GenericOnOff.typeSet,
};
