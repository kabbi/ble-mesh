const jBinary = require('jbinary');

const PropertyType = {
  0x4E: 'PresentAmbientLightLevel',
  0x54: 'PresentDeviceOperatingTemperature',
  0x75: 'PrecisePresentAmbientTemperature'
};

exports.messages = {
  0x52: 'SensorStatus',
  0x8230: 'SensorDescriptorGet',
  0x8231: 'SensorGet'
};

exports.typeSet = {
  // Helpers
  Scaled: jBinary.Template({
    setParams(itemType, factor) {
      this.baseType = itemType;
      this.factor = factor;
    },
    read() {
      return this.baseRead() * this.factor;
    },
    write(value) {
      this.baseWrite(value / this.factor);
    }
  }),

  // Property values
  PresentDeviceOperatingTemperature: ['Scaled', 'uint16', 0.01],
  PrecisePresentAmbientTemperature: ['Scaled', 'uint16', 0.01],
  PresentAmbientLightLevel: ['Scaled', 'uint16', 0.01],

  // Messages
  SensorDescriptorGet: {},
  SensorStatus: jBinary.Type({
    read() {
      let result = [];
      while (this.binary.tell() < this.binary.view.byteLength) {
        var start = this.binary.read('uint16');
        let length, propertyId;
        if (start & 1) {
          length = (start >> 1) & 0x7f;
          propertyId = this.binary.read('uint8') | (start & 0xff);
        } else {
          length = (start >> 1) & 0xf;
          propertyId = (start >> 5) & 0x7ff;
        }
        const propertyType = PropertyType[propertyId];
        const valueBinary = this.binary.slice(
          this.binary.tell(),
          this.binary.tell() + length + 1
        );
        this.binary.skip(length + 1);
        result.push({
          propertyId: propertyType || propertyId,
          value: valueBinary.read(propertyType || 'blob')
        });
      }
      return result;
    },
    write(values) {
      this.binary.write('uint16', values.length);
      this.binary.write(['array', this.itemType], values);
    }
  }),
  SensorGet: {}
};
