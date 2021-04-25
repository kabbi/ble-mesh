const noble = require('@abandonware/noble');
const debug = require('debug')('mesh:connection-manager');

const NetworkLayer = require('./layers/network-layer');
const LowerLayer = require('./layers/lower-transport-layer');
const UpperLayer = require('./layers/upper-transport-layer');
const AccessLayer = require('./layers/access-layer');
const EventEmitter = require('./utils/event-emitter');
const createBinary = require('./utils/binary');
const Keychain = require('./keychain');
const typeSet = require('./packets');
require('./utils/add-debug-formatters');

const { parse, write } = createBinary(typeSet);

const ProxyServiceUUID = '1828';
const ProxyDataInCharUUID = '2add';
const ProxyDataOutCharUUID = '2ade';

class ConnectionManager extends EventEmitter {
  constructor() {
    super();

    this.keychain = new Keychain();
    this.keychain.load(require('../keychain.json'));

    const networkLayer = new NetworkLayer(this.keychain);
    const lowerLayer = new LowerLayer(this.keychain);
    const upperLayer = new UpperLayer();
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

    this.networkLayer = networkLayer;
    this.lowerLayer = lowerLayer;
    this.upperLayer = upperLayer;
    this.accessLayer = accessLayer;
  }

  start() {
    // TODO: Async?
    this.scan();
  }

  async stop() {
    // TODO: Disconnect
    await noble.stopScanningAsync();
  }

  scan() {
    noble.on('stateChange', async state => {
      if (state === 'poweredOn') {
        debug('starting scanning');
        await noble.startScanningAsync([ProxyServiceUUID]);
      } else {
        await noble.stopScanningAsync();
      }
    });

    noble.on('discover', async peripheral => {
      debug('peripheral with ID %s found', peripheral.id);

      const { advertisement } = peripheral;
      const [firstServiceData] = advertisement.serviceData;
      if (firstServiceData) {
        const packet = parse('Advertisement', firstServiceData.data);
        debug('mesh network ID %s', packet.networkID.toString('hex'));
      }

      await noble.stopScanningAsync();
      this.connect(peripheral);
    });
  }

  async connect(peripheral) {
    await peripheral.connectAsync();

    debug('connected');

    const {
      characteristics: [dataIn, dataOut],
    } = await peripheral.discoverSomeServicesAndCharacteristicsAsync(
      [ProxyServiceUUID],
      [ProxyDataInCharUUID, ProxyDataOutCharUUID],
    );

    peripheral.on('disconnect', async () => {
      debug('connection lost, reconnecting');
      await noble.startScanningAsync([ProxyServiceUUID]);
    });

    // Handle incoming messages
    await dataOut.subscribeAsync();
    dataOut.on('data', data => {
      try {
        const message = parse('ProxyPDU', data);
        debug('incoming %o', message);
        if (message.type === 'Network') {
          this.networkLayer.handleIncoming(message.payload);
        }
        if (
          message.type === 'Beacon' &&
          message.payload.type === 'SecureNetwork'
        ) {
          this.networkLayer.ivIndex = message.payload.payload.ivIndex;
          this.disableProxyFiltering();
        }
      } catch (error) {
        debug('incoming unknown %h', data);
      }
    });

    // Handle outgoing messages
    this.networkLayer.on('outgoing', payload => {
      const packet = {
        sar: 'Complete',
        type: this.nextPacketProxy ? 'Proxy' : 'Network',
        payload,
      };
      const data = write('ProxyPDU', packet);
      debug('writing %h', data);
      dataIn.write(data, true);
      this.nextPacketProxy = false;
    });

    this.accessLayer.on('incoming', message => {
      debug('parsed incoming %O', message);
      this.emit('incoming', message);
    });
  }

  disableProxyFiltering() {
    debug('disabling proxy filtering');
    this.nextPacketProxy = true;
    this.networkLayer.handleOutgoing({
      meta: {
        type: 'control',
        from: 0x7ff,
        to: 0x00,
        ttl: 0,
        seq: 0,
      },
      payload: Buffer.of(0x00, 0x01),
      nonce: write('Nonce', {
        type: 'Proxy',
        payload: {
          ivIndex: this.networkLayer.ivIndex,
          src: 0x7ff,
          seq: 0,
        },
      }),
    });
  }

  send(message) {
    this.accessLayer.handleOutgoing(message);
  }
}

module.exports = ConnectionManager;
