// flow-typed signature: d1ddb828ae1060183fcfcf381421a41b
// flow-typed version: <<STUB>>/node-aes-cmac_v^0.1.1/flow_v0.66.0

/**
 * This is an autogenerated libdef stub for:
 *
 *   'node-aes-cmac'
 *
 * Fill this stub out by replacing all the `any` types.
 *
 * Once filled out, we encourage you to share your work with the
 * community by sending a pull request to:
 * https://github.com/flowtype/flow-typed
 */

declare module 'node-aes-cmac' {
  declare type Options = {
    returnAsBuffer: true,
  };
  declare class AesCmac {
    aesCmac(key: Buffer | string, message: Buffer | string): string;
    aesCmac(
      key: Buffer | string,
      message: Buffer | string,
      options: Options,
    ): Buffer;
  }
  declare module.exports: AesCmac;
}
