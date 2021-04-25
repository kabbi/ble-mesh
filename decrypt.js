const NetworkLayer = require('./src/layers/network-layer');
const LowerTransportLayer = require('./src/layers/lower-transport-layer');
const UpperTransportLayer = require('./src/layers/upper-transport-layer');
const AccessLayer = require('./src/layers/access-layer');
const SeqProvider = require('./src/utils/seq-provider');
const Keychain = require('./src/keychain');

const keychain = new Keychain();
keychain.load(require('./keychain.json'));

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

accessLayer.on('incoming', message => {
  console.log(JSON.stringify(message, null, 2));
});

SeqProvider.setTransient(true);
networkLayer.handleIncoming(Buffer.from(process.argv[2], 'hex'));
