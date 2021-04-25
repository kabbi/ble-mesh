const jBinary = require('jbinary');

exports.messages = {
  0xc13298: 'KabbiStripSet',
  0xc23298: 'KabbiStripSetSegment',
};

exports.typeSet = {
  Color: {
    r: 'uint8',
    g: 'uint8',
    b: 'uint8',
    w: 'uint8',
  },
  KabbiStripSet: {
    pixels: ['array', 'Color', 4],
  },
  KabbiStripSetSegment: {
    from: 'uint16',
    to: 'uint16',
    color: 'Color',
  },
};
