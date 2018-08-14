const jBinary = require('jbinary');

module.exports = jBinary.Template({
  setParams(baseType, allFlags) {
    this.baseType = baseType;
    this.allFlags = allFlags;
  },
  read() {
    const value = this.baseRead();
    const flags = {};
    for (const key of Object.keys(this.allFlags)) {
      const flagValue = this.allFlags[key];
      flags[key] = (value & flagValue) === flagValue;
    }
    return flags;
  },
  write(flags) {
    let value = 0;
    for (const key of Object.keys(flags)) {
      if (flags[key]) {
        value |= this.allFlags[key];
      }
    }
    this.baseWrite(value);
  },
});
