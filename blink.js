const noble = require('@abandonware/noble');
const debug = require('debug')('app:explorer');

const typeSet = require('./src/packets');
const createBinary = require('./src/utils/binary');
require('./src/utils/add-debug-formatters');

const NetworkLayer = require('./src/layers/network-layer');
const LowerLayer = require('./src/layers/lower-transport-layer');
const UpperLayer = require('./src/layers/upper-transport-layer');
const AccessLayer = require('./src/layers/access-layer');
const Keychain = require('./src/keychain');

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

const addrStr = process.argv[2];
if (!addrStr) {
  console.error('Please, specify the target address: `npm run blink 0x0001`');
  process.exit(1);
}

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
        dataOut.subscribe(handleError);
        dataOut.on('data', data => {
          try {
            const message = parse('ProxyPDU', data);
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
        });

        // Handle outgoing messages
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

        // Wait for first incoming message, then start blinking
        let status = 'off';
        const addr = Number.parseInt(addrStr, 16);
        setTimeout(() => {
          status = status === 'on' ? 'off' : 'on';
          debug('sending blink %s', status);
          accessLayer.handleOutgoing({
            type: 'GenericOnOffSet',
            appKey: 'mi',
            payload: {
              transactionId: 1,
              status,
            },
            meta: {
              from: 0x7ff,
              to: addr,
            },
          });
        }, 1000);
      },
    );
  });
}
