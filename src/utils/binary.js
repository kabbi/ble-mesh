// @flow

const jBinary = require('jbinary');

module.exports = typeSet => ({
  parse: (typeName, data) => {
    const jbinary = new jBinary(data, typeSet);
    return jbinary.read(typeName);
  },
  write: (typeName, data) => {
    const result = Buffer.alloc(1000);
    const jbinary = new jBinary(result, typeSet);
    jbinary.write(typeName, data);
    return result.slice(0, jbinary.tell());
  },
});
