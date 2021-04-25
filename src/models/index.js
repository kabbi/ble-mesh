const jBinary = require('jbinary');

const BitFlags = require('../utils/jbinary/bit-flags');
const VarInt = require('../utils/jbinary/var-int');

const Configuration = require('./configuration');
const GenericOnOff = require('./generic-onoff');
const GenericLevel = require('./generic-level');
const GenericBattery = require('./generic-battery');
const LightLightness = require('./light-lightness');
const LightCTL = require('./light-ctl');
const LightHSL = require('./light-hsl');
const Sensor = require('./sensor');
const KabbiStrip = require('./kabbi-strip');

exports.messages = {
  ...Configuration.messages,
  ...GenericOnOff.messages,
  ...GenericLevel.messages,
  ...GenericBattery.messages,
  ...LightLightness.messages,
  ...LightCTL.messages,
  ...LightHSL.messages,
  ...Sensor.messages,
  ...KabbiStrip.messages,
};

exports.typeSet = {
  'jBinary.littleEndian': true,
  // Common binary helpers
  BitFlags,
  VarInt,
  // Model type definitions
  ...Configuration.typeSet,
  ...GenericOnOff.typeSet,
  ...GenericLevel.typeSet,
  ...GenericBattery.typeSet,
  ...LightLightness.typeSet,
  ...LightCTL.typeSet,
  ...LightHSL.typeSet,
  ...Sensor.typeSet,
  ...KabbiStrip.typeSet,
};
