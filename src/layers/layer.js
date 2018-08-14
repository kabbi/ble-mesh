// @flow

export interface Layer<Meta, PDU, NextPDU> {
  next: Layer<Meta, PDU, NextPDU>;

  sendMessage(meta: Meta, pdu: PDU): void;
}
