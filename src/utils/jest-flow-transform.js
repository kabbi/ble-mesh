const flowRemoveTypes = require('flow-remove-types');
module.exports = {
  process(src, filename) {
    return flowRemoveTypes(src).toString();
  },
};
