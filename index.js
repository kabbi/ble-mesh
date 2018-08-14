// @flow

const noble = require('noble');
const debug = require('debug')('app:explorer');
const jBinary = require('jbinary');

const typeSet = require('./src/packets');
const createBinary = require('./src/utils/binary');
const { hex } = require('./src/utils/tags');
require('./src/utils/add-debug-formatters');

const NetworkLayer = require('./src/layers/network-layer');
const LowerLayer = require('./src/layers/lower-transport-layer');
const UpperLayer = require('./src/layers/upper-transport-layer');
const AccessLayer = require('./src/layers/access-layer');
const Keychain = require('./src/keychain');

import type { ProxyPDU } from './src/packet-types';

const ProxyServiceUUID = '1828';
const ProxyDataInCharUUID = '2add';
const ProxyDataOutCharUUID = '2ade';

const { parse, write } = createBinary(typeSet);

const handleError = (error: ?Error) => {
  if (!error) {
    return;
  }
  debug('fatal error: %O', error);
  process.exit(2);
};

noble.on('stateChange', state => {
  if (state === 'poweredOn') {
    debug('starting scanning');
    noble.startScanning([ProxyServiceUUID]);
  } else {
    noble.stopScanning();
  }
});

noble.on('discover', peripheral => {
  noble.stopScanning();

  debug('peripheral with ID %s found', peripheral.id);
  const { advertisement } = peripheral;

  const [firstServiceData] = advertisement.serviceData;
  if (firstServiceData) {
    const packet = parse('Advertisement', firstServiceData.data);
    debug('mesh network ID %s', packet.networkID.toString('hex'));
  }

  connect(peripheral);
});

function connect(peripheral) {
  debug('connecting');

  const keychain = new Keychain();
  keychain.load(require('./keychain.json'));

  const networkLayer = new NetworkLayer(keychain);
  const lowerLayer = new LowerLayer(keychain);
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

  peripheral.on('disconnect', () => {
    debug('disconnected');
    process.exit(0);
  });

  peripheral.connect(error => {
    handleError(error);
    debug('discovering services');
    peripheral.discoverSomeServicesAndCharacteristics(
      [ProxyServiceUUID],
      [ProxyDataInCharUUID, ProxyDataOutCharUUID],
      (error, services, characteristics) => {
        handleError(error);
        const [dataIn, dataOut] = characteristics;

        // Handle incoming messages
        dataOut.on('data', data => {
          try {
            const message: ProxyPDU = parse('ProxyPDU', data);
            debug('incoming %o', message);
            if (message.type === 'Network') {
              networkLayer.handleIncoming(message.payload);
            }
            if (
              message.type === 'Beacon' &&
              message.payload.type === 'SecureNetwork'
            ) {
              networkLayer.ivIndex = message.payload.payload.ivIndex;
            }
          } catch (error) {
            debug('incoming unknown %s', data.toString('hex'));
          }
          // peripheral.disconnect(() => {
          //   process.exit(0);
          // });
        });
        dataOut.subscribe(handleError);

        // Wait for first incoming message, then send something
        dataOut.once('data', () => {
          debug('sending test message');
          accessLayer.handleOutgoing({
            type: 'GenericOnOffSet',
            appKey: 'blinker',
            payload: {
              status: 'off',
              transactionId: 42,
              transitionTime: 0,
              delay: 0,
            },
            meta: {
              type: 'access',
              from: 2047,
              to: 1,
              seq: 131,
            },
          });
        });

        networkLayer.on('outgoing', payload => {
          const packet = {
            sar: 'Complete',
            type: 'Network',
            payload,
          };
          const data = write('ProxyPDU', packet);
          debug('writing %s', data.toString('hex'));
          dataIn.write(data, true);
        });
        accessLayer.on('incoming', message => {
          debug('parsed incoming %O', message);
        });
      },
    );
  });
}
