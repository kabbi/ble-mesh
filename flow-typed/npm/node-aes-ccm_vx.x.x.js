// flow-typed signature: 8f9fbd84a553652ede073d69fbb62046
// flow-typed version: <<STUB>>/node-aes-ccm_v^1.0.2/flow_v0.66.0

declare module 'node-aes-ccm' {
  declare class AesCcm {
    encrypt(
      key: Buffer,
      iv: Buffer,
      plaintext: Buffer,
      aad: Buffer,
      auth_tag_length: number,
    ): {
      ciphertext: Buffer,
      auth_tag: Buffer,
    };
    decrypt(
      key: Buffer,
      iv: Buffer,
      ciphertext: Buffer,
      aad: Buffer,
      auth_tag: Buffer,
    ): {
      plaintext: Buffer,
      auth_ok: boolean,
    };
  }
  declare module.exports: AesCcm;
}
