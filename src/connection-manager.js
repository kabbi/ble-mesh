// @flow

const noble = require('@abandonware/noble');
const debug = require('debug')('app:connection-manager');

const NetworkLayer = require('./layers/network-layer');
const LowerLayer = require('./layers/lower-transport-layer');
const UpperLayer = require('./layers/upper-transport-layer');
const AccessLayer = require('./layers/access-layer');
const EventEmitter = require('./utils/event-emitter');
const createBinary = require('./utils/binary');
const Keychain = require('./keychain');
const typeSet = require('./packets');

import type { ModelMessage } from './message-types';
import type { ProxyPDU } from './packet-types';

const { parse, write } = createBinary(typeSet);

const ProxyServiceUUID = '1828';
const ProxyDataInCharUUID = '2add';
const ProxyDataOutCharUUID = '2ade';

type Events = {
  connecting: [],
  reconnecting: [],
  connected: [],
  incoming: [ModelMessage],
};

class ConnectionManager extends EventEmitter<Events> {
  keychain: Keychain;

  networkLayer: NetworkLayer;
  lowerLayer: LowerLayer;
  upperLayer: UpperLayer;
  accessLayer: AccessLayer;

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
    const {
      characteristics: [dataIn, dataOut],
    } = await peripheral.discoverSomeServicesAndCharacteristicsAsync(
      [ProxyServiceUUID],
      [ProxyDataInCharUUID, ProxyDataOutCharUUID],
    );

    // Handle incoming messages
    await dataOut.subscribeAsync();
    dataOut.on('data', data => {
      try {
        const message: ProxyPDU = parse('ProxyPDU', data);
        debug('incoming %o', message);
        if (message.type === 'Network') {
          this.networkLayer.handleIncoming(message.payload);
        }
        if (
          message.type === 'Beacon' &&
          message.payload.type === 'SecureNetwork'
        ) {
          this.networkLayer.ivIndex = message.payload.payload.ivIndex;
        }
      } catch (error) {
        debug('incoming unknown %s', data.toString('hex'));
      }
    });

    // Handle outgoing messages
    this.networkLayer.on('outgoing', payload => {
      const packet = {
        sar: 'Complete',
        type: 'Network',
        payload,
      };
      const data = write('ProxyPDU', packet);
      debug('writing %s', data.toString('hex'));
      dataIn.write(data, true);
    });

    this.accessLayer.on('incoming', message => {
      debug('parsed incoming %O', message);
      this.emit('incoming', message);
    });
  }

  send(message: ModelMessage) {
    this.accessLayer.handleOutgoing(message);
  }
}
