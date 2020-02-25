// @flow

const crypto = require('crypto');
const bufferXor = require('buffer-xor');
const { aesCmac } = require('node-aes-cmac');
const aesCCM = require('@kabbi/aes-ccm');
const aesjs = require('aes-js');

import type { NetworkPDU } from '../packet-types';

const cmac = (key: Buffer, message: Buffer) =>
  aesCmac(key, message, { returnAsBuffer: true });

// Low-level crypto primitives, by Mesh Spec 1.0

const ZeroBuffer = Buffer.alloc(16);

const s1 = (message: string) => cmac(ZeroBuffer, Buffer.from(message));

const k1 = (key: Buffer, salt: Buffer, payload: Buffer): Buffer => {
  const temp = cmac(salt, key);
  return cmac(temp, payload);
};

const k2 = (key: Buffer, payload: Buffer) => {
  const temp = cmac(s1('smk2'), key);
  const t1 = cmac(temp, Buffer.concat([payload, Buffer.from([0x01])]));
  const t2 = cmac(temp, Buffer.concat([t1, payload, Buffer.from([0x02])]));
  const t3 = cmac(temp, Buffer.concat([t2, payload, Buffer.from([0x03])]));
  return Buffer.concat([t1, t2, t3]);
};

const k3 = (key: Buffer): Buffer => {
  const temp = cmac(s1('smk3'), key);
  return cmac(temp, Buffer.from('id64\x01')).slice(8, 16);
};

const k4 = (key: Buffer): number => {
  const temp = cmac(s1('smk4'), key);
  return cmac(temp, Buffer.from('id6\x01'))[15] & 0x3f;
};

const e = (key: Buffer, payload: Buffer): Buffer => {
  const aes = new aesjs.AES(key);
  return Buffer.from(aes.encrypt(payload));
};

type EncryptionResult = {
  payload: Buffer,
  mic: Buffer,
};

const encrypt = (
  key: Buffer,
  nonce: Buffer,
  payload: Buffer,
  micLength: number,
): EncryptionResult => {
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

const decrypt = (
  key: Buffer,
  nonce: Buffer,
  payload: Buffer,
  mic: Buffer,
): ?Buffer => {
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

exports.deriveKeyID = (key: Buffer): number => k4(key);

exports.deriveNetworkID = (networkKey: Buffer): Buffer => k3(networkKey);

exports.deriveNetworkKeys = (networkKey: Buffer): * => {
  const data = k2(networkKey, Buffer.from([0]));
  return {
    nid: data[15] & 0x7f,
    encryptionKey: data.slice(16, 32),
    privacyKey: data.slice(32, 48),
  };
};

exports.deriveBeaconKey = (networkKey: Buffer): Buffer =>
  k1(networkKey, s1('nkbk'), Buffer.from('id128\x01'));

exports.obfuscateMeta = (
  privacyKey: Buffer,
  ivIndex: number,
  message: NetworkPDU,
): NetworkPDU => ({
  ...message,
  obfuscatedPart: exports.deobfuscateMeta(privacyKey, ivIndex, message),
});

exports.deobfuscateMeta = (
  privacyKey: Buffer,
  ivIndex: number,
  message: NetworkPDU,
): Buffer => {
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

type Auth = {
  body: Buffer,
  cmac: Buffer,
};

exports.verifyBeacon = (auth: Auth, beaconKey: Buffer): boolean =>
  crypto.timingSafeEqual(cmac(beaconKey, auth.body).slice(0, 8), auth.cmac);
