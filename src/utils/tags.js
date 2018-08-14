// @flow

exports.hex = (parts: any[]): Buffer => {
  const str = parts.join('').replace(/^0x/, '');
  return Buffer.from(str, 'hex');
};
