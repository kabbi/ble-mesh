const { deriveNetworkKeys, deriveKeyID } = require('./utils/mesh-crypto');

class Keychain {
  constructor(networkKey) {
    this.networkKeys = [];
    this.deviceKeys = {};
    this.appKeys = {};
    if (networkKey) {
      this.addNetworkKey(networkKey);
    }
  }

  load(data) {
    this.addNetworkKey(Buffer.from(data.network, 'hex'));
    for (const [address, key] of Object.entries(data.devices)) {
      this.addDeviceKey(+address, Buffer.from(key, 'hex'));
    }
    for (const [alias, key] of Object.entries(data.apps)) {
      this.addAppKey(alias, Buffer.from(key, 'hex'));
    }
  }

  addNetworkKey(data) {
    this.networkKeys.push({
      ...deriveNetworkKeys(data),
      data,
    });
  }

  addAppKey(alias, data) {
    this.appKeys[alias] = {
      id: deriveKeyID(data),
      alias,
      data,
    };
  }

  addDeviceKey(address, data) {
    this.deviceKeys[address] = {
      address,
      data,
    };
  }

  getNetworkKeyByNID(nid) {
    return this.networkKeys.find((key) => key.nid === nid);
  }

  getAppKeyByID(id) {
    return Object.values(this.appKeys).find((key) => key.id === id);
  }
}

module.exports = Keychain;
