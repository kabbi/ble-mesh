// @flow

export type NetworkPDU = {
  ivi: number,
  nid: number,
  obfuscatedPart: Buffer,
  encryptedPart: Buffer,
};

export type NetworkMeta = {
  ctl: boolean,
  ttl: number,
  seq: number,
  src: number,
  dst: number,
};

export type Segmented = {
  sar: 'Complete' | 'First' | 'Continuation' | 'Last',
};

export type UnprovisionedDeviceBeacon = {
  type: 'UnprovisionedDevice',
  payload: {
    deviceUUID: Buffer,
    oob: number,
    uriHash: number,
  },
};

export type SecureNetworkBeacon = {
  type: 'SecureNetwork',
  payload: {
    flags: {
      keyRefresh: boolean,
      ivUpdate: boolean,
    },
    networkID: Buffer,
    ivIndex: number,
    auth: {
      body: Buffer,
      cmac: Buffer,
    },
  },
};

export type NetworkMessage = Segmented & {
  type: 'Network',
  payload: Buffer,
};

export type ProxyMessage = Segmented & {
  type: 'Proxy',
  payload: NetworkPDU,
};

export type BeaconMessage = Segmented & {
  type: 'Beacon',
  payload: UnprovisionedDeviceBeacon | SecureNetworkBeacon,
};

export type ProxyPDU = BeaconMessage | NetworkMessage | ProxyMessage;

export type SegmentedLowerTransportPDU = {
  seqAuth: number,
  segmentOffset: number,
  segmentCount: number,
  payload: Buffer,
};

export type AccessLowerTransportPDU =
  | {
      segmented: false,
      appKeyUsed: boolean,
      appKeyID: number,
      payload: Buffer,
    }
  | (SegmentedLowerTransportPDU & {
      segmented: true,
      appKeyUsed: boolean,
      appKeyID: number,
      longMIC: boolean,
    });

export type ControlLowerTransportPDU =
  | {
      segmented: false,
      opcode: number,
      payload: Buffer,
    }
  | (SegmentedLowerTransportPDU & {
      segmented: true,
      opcode: number,
    });
