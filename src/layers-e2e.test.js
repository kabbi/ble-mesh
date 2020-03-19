const {hex} = require('./utils/tags');

const NetworkLayer = require('./layers/network-layer');
const LowerTransportLayer = require('./layers/lower-transport-layer');
const UpperTransportLayer = require('./layers/upper-transport-layer');
const AccessLayer = require('./layers/access-layer');
const Keychain = require('./keychain');

// See test-packets.txt

describe('e2e exchange', () => {
  describe('by Android-nRF-Mesh-Library', () => {
    const keychain = new Keychain();
    keychain.addNetworkKey(hex`2109E653D1E8265E3F453D462A569443`);
    keychain.addDeviceKey(0x1, hex`3A9FE13D360DB3E5F32E06DD771DB6DD`);
    keychain.addDeviceKey(0x7ff, hex`3A9FE13D360DB3E5F32E06DD771DB6DD`);
    keychain.addAppKey('test', hex`63964771734fbd76e3b40519d1d94a48`);

    const networkLayer = new NetworkLayer(keychain);
    const lowerLayer = new LowerTransportLayer(keychain);
    const upperLayer = new UpperTransportLayer();
    const accessLayer = new AccessLayer();

    // Connect all the layers together
    networkLayer.on('incoming', networkMessage => {
      lowerLayer.handleIncoming(networkMessage);
    });
    lowerLayer.on('incoming', lowerTransportMessage => {
      upperLayer.handleIncoming(lowerTransportMessage);
    });
    upperLayer.on('incoming', accessMessage => {
      accessLayer.handleIncoming(accessMessage);
    });
    accessLayer.on('outgoing', accessMessage => {
      upperLayer.handleOutgoing(accessMessage);
    });
    upperLayer.on('outgoing', lowerTransportMessage => {
      lowerLayer.handleOutgoing(lowerTransportMessage);
    });
    lowerLayer.on('outgoing', networkMessage => {
      networkLayer.handleOutgoing(networkMessage);
    });

    describe('incoming', () => {
      it('config composition data get', () => {
        const listener = jest.fn();
        accessLayer.once('incoming', listener);
        networkLayer.handleIncoming(
          hex`665F9DA2E40616C19810AB0D315BEEFEC676574475`,
        );
        expect(listener.mock.calls[0]).toMatchSnapshot();
      });

      it('config composition data status', () => {
        const listener = jest.fn();
        accessLayer.once('incoming', listener);
        networkLayer.once('outgoing', listener);
        networkLayer.handleIncoming(
          hex`660836484CBF76FD5508F4AE7A27EBD5311DB6F19ED769AFDA3A42B048`,
        );
        networkLayer.handleIncoming(
          hex`66441FE8C6136A6017DB6E2B63C670A1E3FB9441E1AA67040DCE3C7D54`,
        );
        networkLayer.handleIncoming(
          hex`6631C9744111DE17E2B1FCC02919BAF45CF7C80A235FF3E8C624FD0A82`,
        );
        // Two messages: segment ack and composition data
        expect(listener.mock.calls[0][0]).toEqual(
          hex`66FCC1540B1A913D8A6131B6B15381C3300BED16A9CBA17F`,
        );
        expect(listener.mock.calls[1]).toMatchSnapshot();
      });

      it('config appkey add', () => {
        const listener = jest.fn();
        accessLayer.once('incoming', listener);
        networkLayer.once('outgoing', listener);
        networkLayer.handleIncoming(
          hex`661EBCB1CCCD873D3D0A6F4CF07AAC53F2331CF4BF54FF101B8017A706`,
        );
        networkLayer.handleIncoming(
          hex`66090D55CBA954B445FBF2027FB3E6062FE5C27D71CEB2E0F507A8FD91`,
        );
        // Two messages: segment ack and composition data
        expect(listener.mock.calls[0][0]).toEqual(
          hex`66f6e9a7e7a4f241ca2ba28fde9cd97a3e8479c121baf315`,
        );
        expect(listener.mock.calls[1]).toMatchSnapshot();
      });

      it('config appkey status 2', () => {
        const listener = jest.fn();
        accessLayer.once('incoming', listener);
        networkLayer.handleIncoming(
          hex`66B708C00FD0B25C01E1364496561405E4EC55E347E32F8A`,
        );
        expect(listener.mock.calls[0]).toMatchSnapshot();
      });

      it('config model app bind', () => {
        const listener = jest.fn();
        accessLayer.once('incoming', listener);
        networkLayer.handleIncoming(
          hex`6683B4EEF41F307A010F3611324F68EB47A9CBB67009D7C707B8`,
        );
        expect(listener.mock.calls[0]).toMatchSnapshot();
      });

      it('config model app status', () => {
        const listener = jest.fn();
        accessLayer.once('incoming', listener);
        networkLayer.handleIncoming(
          hex`66EF826A1523F58347E6B25BF5D304D9D23FB03E3B2FBAA04FF6B5`,
        );
        expect(listener.mock.calls[0]).toMatchSnapshot();
      });

      it('generic onoff set', () => {
        const listener = jest.fn();
        accessLayer.once('incoming', listener);
        networkLayer.handleIncoming(
          hex`665C84C794A7585BB9C5FA469CD58A042A26EE7149C36C89`,
        );
        expect(listener.mock.calls[0]).toMatchSnapshot();
      });

      it('generic onoff status', () => {
        const listener = jest.fn();
        accessLayer.once('incoming', listener);
        networkLayer.handleIncoming(
          hex`66C1B146EAE9230FBA8996C7AFF8EA16EBDDFF9381`,
        );
        expect(listener.mock.calls[0]).toMatchSnapshot();
      });

      it('generic onoff get', () => {
        const listener = jest.fn();
        accessLayer.once('incoming', listener);
        networkLayer.handleIncoming(
          hex`66F6504844AB3786DC5FD1CF41B153FBEB2A7450`,
        );
        expect(listener.mock.calls[0]).toMatchSnapshot();
      });
    });

    describe('outgoing', () => {
      it('sends generic onoff get', () => {
        const listener = jest.fn();
        networkLayer.once('outgoing', listener);
        accessLayer.handleOutgoing({
          meta: {from: 0x7ff, to: 1},
          type: 'GenericOnOffGet',
        });
        expect(listener).toHaveBeenCalledWith(
          hex`6620ac6dfb39fc50b95f2085da860d17afffcf6c`,
        );
      });

      it('loops around', () => {
        const listener = jest.fn();
        accessLayer.once('incoming', listener);
        networkLayer.once('outgoing', message => {
          networkLayer.handleIncoming(message);
        });
        accessLayer.handleOutgoing({
          meta: {from: 0x7ff, to: 1},
          type: 'GenericOnOffSet',
          payload: {
            status: 'on',
            transactionId: 42,
          },
        });
        expect(listener).toHaveBeenCalledWith({
          meta: {from: 0x7ff, to: 1, ttl: 100, seq: 1, type: 'access'},
          type: 'GenericOnOffSet',
          payload: {
            status: 'on',
            transactionId: 42,
          },
        });
      });
    });
  });
});
