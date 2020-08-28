const jBinary = require('jbinary');

const BitFlags = require('../utils/jbinary/bit-flags');
const VarInt = require('../utils/jbinary/var-int');

const Configuration = require('./configuration');
const GenericOnOff = require('./generic-onoff');
const GenericBattery = require('./generic-battery');
const LightLightness = require('./light-lightness');
const LightCTL = require('./light-ctl');
const Sensor = require('./sensor');

exports.messages = {
  ...Configuration.messages,
  ...GenericOnOff.messages,
  ...GenericBattery.messages,
  ...LightLightness.messages,
  ...LightCTL.messages,
  ...Sensor.messages,
};

exports.typeSet = {
  'jBinary.littleEndian': true,
  // Common binary helpers
  BitFlags,
  VarInt,
  // Model type definitions
  ...Configuration.typeSet,
  ...GenericOnOff.typeSet,
  ...GenericBattery.typeSet,
  ...LightLightness.typeSet,
  ...LightCTL.typeSet,
  ...Sensor.typeSet,
};
