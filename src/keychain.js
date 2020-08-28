// @flow

const { deriveNetworkKeys, deriveKeyID } = require('./utils/mesh-crypto');

export type NetworkKey = {
  data: Buffer,
  nid: number,
  encryptionKey: Buffer,
  privacyKey: Buffer,
};

export type AppKey = {
  data: Buffer,
  alias: string,
  id: number,
};

export type DeviceKey = {
  data: Buffer,
  address: number,
};

class Keychain {
  networkKeys: NetworkKey[];
  deviceKeys: { [address: number]: DeviceKey };
  appKeys: { [alias: string]: AppKey };

  constructor(networkKey?: Buffer) {
    this.networkKeys = [];
    this.deviceKeys = {};
    this.appKeys = {};
    if (networkKey) {
      this.addNetworkKey(networkKey);
    }
  }

  load(data: any): void {
    this.addNetworkKey(Buffer.from(data.network, 'hex'));
    for (const [address, key] of Object.entries(data.devices)) {
      this.addDeviceKey(+address, Buffer.from(key, 'hex'));
    }
    for (const [alias, key] of Object.entries(data.apps)) {
      this.addAppKey(alias, Buffer.from(key, 'hex'));
    }
  }

  addNetworkKey(data: Buffer) {
    this.networkKeys.push({
      ...deriveNetworkKeys(data),
      data,
    });
    console.log(this.networkKeys);
  }

  addAppKey(alias: string, data: Buffer) {
    this.appKeys[alias] = {
      id: deriveKeyID(data),
      alias,
      data,
    };
  }

  addDeviceKey(address: number, data: Buffer) {
    this.deviceKeys[address] = {
      address,
      data,
    };
  }

  getNetworkKeyByNID(nid: number): ?NetworkKey {
    return this.networkKeys.find(key => key.nid === nid);
  }

  getAppKeyByID(id: number): ?AppKey {
    // $FlowFixMe
    return Object.values(this.appKeys).find(key => key.id === id);
  }
}

module.exports = Keychain;
