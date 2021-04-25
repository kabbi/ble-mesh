const {
  verifyBeacon,
  deriveBeaconKey,
  deriveNetworkKeys,
  deriveNetworkID,
  deobfuscateMeta,
  primitives,
} = require('./mesh-crypto');

const { hex } = require('./tags');

// Demo keys and values are taken from Specification
const DemoAppKey = hex`3216d1509884b533248541792b877f98`;
const DemoNetworkKey = hex`f7a2a44f8e8a8029064f173ddc1e2b00`;
const DemoDeviceKey = hex`37c612c4a2d337cb7b98355531b3617f`;

// These are taken from running test mesh network
const NetworkKey = hex`567F3499E7AD71B49CC6F77193F38E7F`;
const BeaconKey = hex`e9966a99a3276fe4a502e1b4e8640735`;
const WrongBeaconKey = hex`08419b2b452ef9796ad9be415feb85df`;

const ValidBeaconAuth = {
  body: hex`003637d5152353902800000000`,
  cmac: hex`7bcfa6acdc7623bb`,
};

const InvalidBeaconAuth = {
  body: hex`003637d5252353902800000000`,
  cmac: hex`7bcfa6acdc7623bb`,
};

describe('mesh-crypto', () => {
  describe('internal primitives with spec demo data', () => {
    it('s1(test)', () => {
      expect(primitives.s1('test').toString('hex')).toBe(
        'b73cefbd641ef2ea598c2b6efb62f79c',
      );
    });

    it('k1(AppKey, salt, payload)', () => {
      expect(
        primitives
          .k1(
            DemoAppKey,
            hex`2ba14ffa0df84a2831938d57d276cab4`,
            hex`5a09d60797eeb4478aada59db3352a0d`,
          )
          .toString('hex'),
      ).toBe('f6ed15a8934afbe7d83e8dcb57fcf5d7');
    });

    it('k2(NetworkKey)', () => {
      const result = primitives.k2(DemoNetworkKey, Buffer.from([0]));
      expect(result.toString('hex')).toBe(
        '82bea685dc2f1deec255ac643741f5ff9f589181a0f50de73c8070c7a6d27f464c715bd4a64b938f99b453351653124f',
      );
    });

    it('k3(NetworkKey)', () => {
      expect(primitives.k3(DemoNetworkKey).toString('hex')).toBe(
        'ff046958233db014',
      );
    });

    it('k4(NetworkKey)', () => {
      expect(primitives.k4(DemoAppKey)).toBe(0x38);
    });

    it('encrypt(message)', () => {
      const result = primitives.encrypt(
        hex`3a4fe84a6cc2c6a766ea93f1084d4039`,
        hex`03000000010001000012345678`,
        hex`00000000`,
        8,
      );
      expect(result.payload.toString('hex')).toBe('8b8c2851');
      expect(result.mic.toString('hex')).toBe('2e792d3711f4b526');
    });

    it('decrypt(message)', () => {
      const result = primitives.decrypt(
        hex`3a4fe84a6cc2c6a766ea93f1084d4039`,
        hex`03000000010001000012345678`,
        hex`8b8c2851`,
        hex`2e792d3711f4b526`,
      );
      expect(result.toString('hex')).toBe('00000000');
    });
  });

  describe('deriveNetworkID', () => {
    it('should derive a known network ID', () => {
      expect(deriveNetworkID(NetworkKey).toString('hex')).toBe(
        '3637d51523539028',
      );
    });
  });

  describe('deriveBeaconKey', () => {
    it('should derive a known key', () => {
      expect(deriveBeaconKey(NetworkKey)).toEqual(BeaconKey);
    });
  });

  describe('deriveNetworkKeys', () => {
    it('should work on spec demo data', () => {
      const { nid, privacyKey, encryptionKey } = deriveNetworkKeys(
        DemoNetworkKey,
      );
      expect(encryptionKey.toString('hex')).toBe(
        '9f589181a0f50de73c8070c7a6d27f46',
      );
      expect(privacyKey.toString('hex')).toBe(
        '4c715bd4a64b938f99b453351653124f',
      );
      expect(nid).toBe(0x7f);
    });
  });

  describe('(de)obfuscateMeta', () => {
    it('should work on spec demo data', () => {
      const result = deobfuscateMeta(
        hex`f695fcce709ccface4d8b7a1e6e39d25`,
        0x12345678,
        {
          obfuscatedPart: hex`386bd60efbbb`,
          encryptedPart: hex`8b8c28512e792d3711f4b526`,
          ivi: 0,
          nid: 0,
        },
      );
      expect(result.toString('hex')).toBe('800000010001');
    });
  });

  describe('verifyBeacon', () => {
    it('should verify a valid PDU', () => {
      expect(verifyBeacon(ValidBeaconAuth, BeaconKey)).toBe(true);
    });
    it('should not verify an invalid PDU', () => {
      expect(verifyBeacon(InvalidBeaconAuth, BeaconKey)).toBe(false);
    });
    it('should not verify with invalid key', () => {
      expect(verifyBeacon(ValidBeaconAuth, WrongBeaconKey)).toBe(false);
    });
  });
});
