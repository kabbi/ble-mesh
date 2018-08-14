// @flow

const jBinary = require('jbinary');

type TypeName = string | any[] | number;

module.exports = (typeSet: any) => ({
  parse: <T>(typeName: TypeName, data: Buffer): T => {
    const jbinary = new jBinary(data, typeSet);
    return jbinary.read(typeName);
  },
  write: <T>(typeName: TypeName, data: T): Buffer => {
    const result = Buffer.alloc(1000);
    const jbinary = new jBinary(result, typeSet);
    jbinary.write(typeName, data);
    return result.slice(0, jbinary.tell());
  },
});
