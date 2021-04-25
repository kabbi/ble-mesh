exports.hex = parts => {
  const str = parts.join('').replace(/^0x/, '');
  return Buffer.from(str, 'hex');
};
