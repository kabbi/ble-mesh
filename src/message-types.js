// @flow

import type {NetworkMeta} from './packet-types';

export type Metadata = {
  type?: 'access' | 'control',
  from: number,
  to: number,
  ttl?: number,
  seq?: number,
};

export type NetworkMessage = {
  meta: Metadata,
  payload: Buffer,
  nonce?: Buffer,
};

export type LowerTransportMessage =
  | {
      meta: Metadata,
      appKey?: string,
      type: 'access',
      payload: Buffer,
    }
  | {
      meta: Metadata,
      type: 'control',
      opcode: number,
      payload: Buffer,
    };

export type AccessMessage = {
  meta: Metadata,
  appKey?: string,
  opcode: number,
  payload: Buffer,
};

export type ModelMessage = {
  meta: Metadata,
  appKey?: string,
  type: string,
  payload: any,
};
