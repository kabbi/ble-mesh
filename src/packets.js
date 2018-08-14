const jBinary = require('jbinary');

const SegmentType = (exports.SegmentType = {
  0: 'Complete',
  1: 'First',
  2: 'Continuation',
  3: 'Last',
});

const PDUMessageType = (exports.PDUMessageType = {
  0: 'Network',
  1: 'Beacon',
  2: 'Proxy',
  3: 'Provision',
});

const BeaconType = (exports.BeaconType = {
  0: 'UnprovisionedDevice',
  1: 'SecureNetwork',
});

const NonceType = {
  0: 'Network',
  1: 'Application',
  2: 'Device',
  3: 'Proxy',
};

const FeatureFlags = {
  Relay: 1 << 0,
  Proxy: 1 << 1,
  Friend: 1 << 2,
  LowPower: 1 << 3,
};

module.exports = {
  'jBinary.littleEndian': false,

  // Util types
  Switch: jBinary.Template({
    params: ['condition'],
    getBaseType() {
      return this.toValue(this.condition);
    },
  }),
  BitBool: jBinary.Template({
    baseType: 1,
    read() {
      return Boolean(this.baseRead());
    },
    write(value) {
      return this.baseWrite(+value);
    },
  }),
  SeekBackBlob: jBinary.Type({
    params: ['length'],
    read() {
      return this.binary.read(
        ['blob', this.length],
        this.binary.tell() - this.length,
      );
    },
    write() {
      // Only ever need to read
    },
  }),
  BitFlags: jBinary.Template({
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
  }),

  // AD types
  Advertisement: {
    type: 'uint8',
    networkID: ['if', context => context.type === 0x00, ['blob', 8]],
  },

  // Common mesh types
  Nonce: {
    type: ['enum', 'uint8', NonceType],
    payload: ['Switch', context => `${context.type}Nonce`],
  },
  ProxyNonce: {
    _padding1: ['const', 'uint8', 0],
    seq: 24,
    src: 'uint16',
    _padding2: ['const', 'uint16', 0],
    ivIndex: 'uint32',
  },
  NetworkNonce: {
    ctl: 1,
    ttl: 7,
    seq: 24,
    src: 'uint16',
    _padding: ['const', 'uint16', 0],
    ivIndex: 'uint32',
  },
  DeviceNonce: {
    aszMic: 'BitBool',
    _padding: ['const', 7, 0],
    seq: 24,
    src: 'uint16',
    dst: 'uint16',
    ivIndex: 'uint32',
  },
  // It seems they are the same
  ApplicationNonce: {
    aszMic: 'BitBool',
    _padding: ['const', 7, 0],
    seq: 24,
    src: 'uint16',
    dst: 'uint16',
    ivIndex: 'uint32',
  },

  // Network types
  NetworkPDU: {
    ivi: 1,
    nid: 7,
    obfuscatedPart: ['blob', 6],
    encryptedPart: 'blob',
  },
  NetworkMeta: {
    ctl: 'BitBool',
    ttl: 7,
    seq: 24,
    src: 'uint16',
  },

  // Proxy types
  ProxyPDU: {
    sar: ['enum', 2, SegmentType],
    type: ['enum', 6, PDUMessageType],
    payload: ['Switch', context => `${context.type}Payload`],
  },

  BeaconPayload: {
    type: ['enum', 'uint8', BeaconType],
    payload: ['Switch', context => `${context.type}Beacon`],
  },
  UnprovisionedDeviceBeacon: {
    deviceUUID: ['blob', 16],
    oob: 'uint8', // FIXME
    uriHash: 'uint32',
  },
  SecureNetworkBeacon: {
    flags: {
      keyRefresh: 'BitBool',
      ivUpdate: 'BitBool',
      _reserved: 6,
    },
    networkID: ['blob', 8],
    ivIndex: 'uint32',
    auth: {
      body: ['SeekBackBlob', 13],
      cmac: ['blob', 8],
    },
  },

  ProxyPayload: 'NetworkPDU',

  NetworkPayload: 'blob',

  AccessLowerTransportPDU: [
    'extend',
    {
      segmented: 'BitBool',
      appKeyUsed: 'BitBool',
      appKeyID: 6,
    },
    [
      'if',
      context => context.segmented,
      {
        longMIC: 'BitBool',
        seqAuth: 13,
        segmentOffset: 5,
        segmentCount: 5,
      },
    ],
    {
      payload: 'blob',
    },
  ],
  ControlLowerTransportPDU: [
    'extend',
    {
      segmented: 'BitBool',
      opcode: 7,
    },
    [
      'if',
      context => context.segmented,
      {
        reserved: ['const', 1, 0],
        seqAuth: 13,
        segmentOffset: 5,
        segmentCount: 5,
      },
    ],
    {
      payload: 'blob',
    },
  ],
  UnsegmentedAccessLowerTransportPDU: {
    seg: ['const', 1, 0],
    appKeyUsed: 'BitBool',
    appKeyID: 6,
    payload: 'blob',
  },
  SegmentedAccessLowerTransportPDU: {
    seg: ['const', 1, 1],
    appKeyUsed: 'BitBool',
    appKeyID: 6,
    longMIC: 'BitBool',
    seqAuth: 13,
    segmentOffset: 5,
    segmentCount: 5,
    payload: 'blob',
  },
  UnsegmentedControlLowerTransportPDU: {
    seg: ['const', 1, 0],
    opcode: 7,
    payload: 'blob',
  },

  SegmentAcknowledgement: {
    byFriendlyNode: 'BitBool',
    seqAuth: 13,
    dummy: ['const', 2, 0],
    blockAck: 'uint32',
  },

  CompositionData: {
    CID: ['uint16', true],
    PID: ['uint16', true],
    VID: ['uint16', true],
    CRPL: ['uint16', true],
    features: ['BitFlags', ['uint16', true], FeatureFlags],
    elements: ['array', 'Element'],
  },
  Element: {
    locationDescriptor: ['uint16', true],
    sigModelIDsCount: 'uint8',
    vendorModelIDsCount: 'uint8',
    sigModelIDs: ['array', ['uint16', true], 'sigModelIDsCount'],
    vendorModelIDs: ['array', ['uint32', true], 'vendorModelIDsCount'],
  },

  ConfigCompositionDataStatus: {
    page: 'uint8',
    data: 'CompositionData',
  },
};
