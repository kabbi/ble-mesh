const jBinary = require('jbinary');

module.exports = jBinary.Type({
  params: ['length'],
  read() {
    const remainingBytes = this.binary.view.byteLength - this.binary.tell();
    return this.binary.read(remainingBytes === 4 ? 'uint32' : 'uint16');
  },
  write(value) {
    this.binary.write(value > 0xffff ? 'uint32' : 'uint16', value);
  },
});
