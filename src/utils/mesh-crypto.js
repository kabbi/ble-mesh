// @flow

const crypto = require('crypto');
const bufferXor = require('buffer-xor');
const { aesCmac } = require('node-aes-cmac');
const aesCCM = require('@kabbi/aes-ccm');
const aesjs = require('aes-js');

const cmac = (key, message) => aesCmac(key, message, { returnAsBuffer: true });

// Low-level crypto primitives, by Mesh Spec 1.0

const ZeroBuffer = Buffer.alloc(16);

const s1 = message => cmac(ZeroBuffer, Buffer.from(message));

const k1 = (key, salt, payload) => {
  const temp = cmac(salt, key);
  return cmac(temp, payload);
};

const k2 = (key, payload) => {
  const temp = cmac(s1('smk2'), key);
  const t1 = cmac(temp, Buffer.concat([payload, Buffer.from([0x01])]));
  const t2 = cmac(temp, Buffer.concat([t1, payload, Buffer.from([0x02])]));
  const t3 = cmac(temp, Buffer.concat([t2, payload, Buffer.from([0x03])]));
  return Buffer.concat([t1, t2, t3]);
};

const k3 = key => {
  const temp = cmac(s1('smk3'), key);
  return cmac(temp, Buffer.from('id64\x01')).slice(8, 16);
};

const k4 = key => {
  const temp = cmac(s1('smk4'), key);
  return cmac(temp, Buffer.from('id6\x01'))[15] & 0x3f;
};

const e = (key, payload) => {
  const aes = new aesjs.AES(key);
  return Buffer.from(aes.encrypt(payload));
};

const encrypt = (key, nonce, payload, micLength) => {
  const result = aesCCM.encrypt(
    key,
    nonce,
    payload,
    Buffer.alloc(0),
    micLength,
  );
  return {
    payload: result.ciphertext,
    mic: result.auth_tag,
  };
};

const decrypt = (key, nonce, payload, mic) => {
  const result = aesCCM.decrypt(key, nonce, payload, Buffer.alloc(0), mic);
  if (!result.auth_ok) {
    return null;
  }
  return result.plaintext;
};

exports.primitives = {
  encrypt,
  decrypt,
  s1,
  k1,
  k2,
  k3,
  k4,
  e,
};

// High level mesh crypto functions

exports.deriveKeyID = key => k4(key);

exports.deriveNetworkID = networkKey => k3(networkKey);

exports.deriveNetworkKeys = networkKey => {
  const data = k2(networkKey, Buffer.from([0]));
  return {
    nid: data[15] & 0x7f,
    encryptionKey: data.slice(16, 32),
    privacyKey: data.slice(32, 48),
  };
};

exports.deriveBeaconKey = networkKey =>
  k1(networkKey, s1('nkbk'), Buffer.from('id128\x01'));

exports.obfuscateMeta = (privacyKey, ivIndex, message) => ({
  ...message,
  obfuscatedPart: exports.deobfuscateMeta(privacyKey, ivIndex, message),
});

exports.deobfuscateMeta = (privacyKey, ivIndex, message) => {
  const ivBuffer = Buffer.alloc(4);
  ivBuffer.writeUInt32BE(ivIndex, 0);
  const privacyRandom = Buffer.concat([
    Buffer.alloc(5),
    ivBuffer,
    message.encryptedPart.slice(0, 7),
  ]);
  const pecb = e(privacyKey, privacyRandom);
  return bufferXor(
    message.obfuscatedPart,
    pecb.slice(0, message.obfuscatedPart.length),
  );
};

exports.verifyBeacon = (auth, beaconKey) =>
  crypto.timingSafeEqual(cmac(beaconKey, auth.body).slice(0, 8), auth.cmac);
