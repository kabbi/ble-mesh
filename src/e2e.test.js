const packetTypeSet = require('./packets');
const { parse, write } = require('./utils/binary')(packetTypeSet);
const { hex } = require('./utils/tags');
const {
  primitives,
  deobfuscateMeta,
  deriveNetworkKeys,
} = require('./utils/mesh-crypto');
const typeSet = require('./packets');

// This is an attempt to manually decode all the messages flowing through the mesh
// Once done here, it is implemented in actual layers/*.js network layers
// See test-packets.txt

xdescribe('e2e exchange - manual', () => {
  describe('by Android-nRF-Mesh-Library', () => {
    const deviceKey = hex`3A9FE13D360DB3E5F32E06DD771DB6DD`;
    const appKey = hex`63964771734fbd76e3b40519d1d94a48`;
    const { nid, privacyKey, encryptionKey } = deriveNetworkKeys(
      hex`2109E653D1E8265E3F453D462A569443`,
    );

    const decryptLowerMessage = (data, upperType, debug) => {
      const pdu = parse('ProxyPDU', data);

      const { payload: message } = pdu;
      const meta = parse(
        'NetworkMeta',
        deobfuscateMeta(privacyKey, 0, message),
      );

      const nonce = write('Nonce', {
        type: 'Network',
        payload: {
          ...meta,
          ivIndex: 0,
        },
      });
      const micLength = meta.ctl ? 8 : 4;
      const networkPayload = primitives.decrypt(
        encryptionKey,
        nonce,
        message.encryptedPart.slice(0, -micLength),
        message.encryptedPart.slice(-micLength),
      );

      const dst = parse('uint16', networkPayload);
      const lower = parse(upperType, networkPayload.slice(2));
      debug && console.log(networkPayload.slice(2).toString('hex'));
      return [lower, meta, dst];
    };

    it('parses unknown message #1', () => {
      const [lower, meta, dst] = decryptLowerMessage(
        hex`00665F9DA2E40616C19810AB0D315BEEFEC676574475`,
        'UnsegmentedAccessLowerTransportPDU',
      );
      const lowerPayload = primitives.decrypt(
        deviceKey,
        write('Nonce', {
          type: 'Device',
          payload: {
            aszMic: false,
            seq: meta.seq,
            src: meta.src,
            ivIndex: 0,
            dst,
          },
        }),
        lower.payload.slice(0, -4),
        lower.payload.slice(-4),
      );
      expect(lowerPayload).toMatchSnapshot();
    });

    it('parses unknown response #1', () => {
      const messages = [
        hex`00660836484CBF76FD5508F4AE7A27EBD5311DB6F19ED769AFDA3A42B048`,
        hex`0066441FE8C6136A6017DB6E2B63C670A1E3FB9441E1AA67040DCE3C7D54`,
        hex`006631C9744111DE17E2B1FCC02919BAF45CF7C80A235FF3E8C624FD0A82`,
      ];
      const segments = messages.map(message => {
        const [lower] = decryptLowerMessage(
          message,
          'SegmentedAccessLowerTransportPDU',
        );
        return lower.payload;
      });
      const [lower, meta, dst] = decryptLowerMessage(
        messages[0],
        'SegmentedAccessLowerTransportPDU',
      );
      const assembledPayload = Buffer.concat(segments);
      const micLength = lower.longMIC ? 8 : 4;
      const upperPayload = primitives.decrypt(
        deviceKey,
        write('Nonce', {
          type: 'Device',
          payload: {
            aszMic: lower.longMIC,
            seq: meta.seq,
            src: meta.src,
            ivIndex: 0,
            dst,
          },
        }),
        assembledPayload.slice(0, -micLength),
        assembledPayload.slice(-micLength),
      );
      expect(upperPayload).toMatchSnapshot();
      const compositionDataStatus = parse(
        'ConfigCompositionDataStatus',
        upperPayload.slice(1),
      );
      expect(compositionDataStatus).toMatchSnapshot();
    });

    it('parses unknown message #2', () => {
      const [lower, meta, dst] = decryptLowerMessage(
        hex`0066FCC1540B1A913D8A6131B6B15381C3300BED16A9CBA17F`,
        'UnsegmentedControlLowerTransportPDU',
      );
      const segmentAck = parse('SegmentAcknowledgement', lower.payload);
      expect(segmentAck).toMatchSnapshot();
    });

    it('parses unknown message #3', () => {
      const messages = [
        hex`00661EBCB1CCCD873D3D0A6F4CF07AAC53F2331CF4BF54FF101B8017A706`,
        hex`0066090D55CBA954B445FBF2027FB3E6062FE5C27D71CEB2E0F507A8FD91`,
      ];
      const segments = messages.map(message => {
        const [lower] = decryptLowerMessage(
          message,
          'SegmentedAccessLowerTransportPDU',
        );
        return lower.payload;
      });
      const [lower, meta, dst] = decryptLowerMessage(
        messages[0],
        'SegmentedAccessLowerTransportPDU',
      );
      const assembledPayload = Buffer.concat(segments);
      const micLength = lower.longMIC ? 8 : 4;
      const upperPayload = primitives.decrypt(
        deviceKey,
        write('Nonce', {
          type: 'Device',
          payload: {
            aszMic: lower.longMIC,
            seq: meta.seq,
            src: meta.src,
            ivIndex: 0,
            dst,
          },
        }),
        assembledPayload.slice(0, -micLength),
        assembledPayload.slice(-micLength),
      );
      expect(upperPayload).toMatchSnapshot();
    });

    it('parses unknown response #3', () => {
      const [lower, meta, dst] = decryptLowerMessage(
        hex`0066782C83E7AD4FD86102611B9FDFFF5241AE64EDD9B27977`,
        'UnsegmentedControlLowerTransportPDU',
      );
      const segmentAck = parse('SegmentAcknowledgement', lower.payload);
      expect(segmentAck).toMatchSnapshot();
    });

    it('parses unknown response #4', () => {
      const [lower, meta, dst] = decryptLowerMessage(
        hex`0066B708C00FD0B25C01E1364496561405E4EC55E347E32F8A`,
        'UnsegmentedAccessLowerTransportPDU',
      );
      const lowerPayload = primitives.decrypt(
        deviceKey,
        write('Nonce', {
          type: 'Device',
          payload: {
            aszMic: false,
            seq: meta.seq,
            src: meta.src,
            ivIndex: 0,
            dst,
          },
        }),
        lower.payload.slice(0, -4),
        lower.payload.slice(-4),
      );
      expect(lowerPayload).toMatchSnapshot();
    });

    it('parses unknown message #5', () => {
      const [lower, meta, dst] = decryptLowerMessage(
        hex`006683B4EEF41F307A010F3611324F68EB47A9CBB67009D7C707B8`,
        'UnsegmentedAccessLowerTransportPDU',
      );
      const lowerPayload = primitives.decrypt(
        deviceKey,
        write('Nonce', {
          type: 'Device',
          payload: {
            aszMic: false,
            seq: meta.seq,
            src: meta.src,
            ivIndex: 0,
            dst,
          },
        }),
        lower.payload.slice(0, -4),
        lower.payload.slice(-4),
      );
      expect(lowerPayload).toMatchSnapshot();
    });

    it('parses unknown message #6', () => {
      const [lower, meta, dst] = decryptLowerMessage(
        hex`0066EF826A1523F58347E6B25BF5D304D9D23FB03E3B2FBAA04FF6B5`,
        'UnsegmentedAccessLowerTransportPDU',
      );
      const lowerPayload = primitives.decrypt(
        deviceKey,
        write('Nonce', {
          type: 'Device',
          payload: {
            aszMic: false,
            seq: meta.seq,
            src: meta.src,
            ivIndex: 0,
            dst,
          },
        }),
        lower.payload.slice(0, -4),
        lower.payload.slice(-4),
      );
      expect(lowerPayload).toMatchSnapshot();
    });

    it('parses unknown message #7', () => {
      const [lower, meta, dst] = decryptLowerMessage(
        hex`00665C84C794A7585BB9C5FA469CD58A042A26EE7149C36C89`,
        'UnsegmentedAccessLowerTransportPDU',
      );
      const lowerPayload = primitives.decrypt(
        appKey,
        write('Nonce', {
          type: 'Application',
          payload: {
            aszMic: false,
            seq: meta.seq,
            src: meta.src,
            ivIndex: 0,
            dst,
          },
        }),
        lower.payload.slice(0, -4),
        lower.payload.slice(-4),
      );
      expect(lowerPayload).toMatchSnapshot();
    });
  });
});
