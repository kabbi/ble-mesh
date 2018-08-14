// @flow

const { hex } = require('./src/utils/tags');

const NetworkLayer = require('./src/layers/network-layer');
const LowerTransportLayer = require('./src/layers/lower-transport-layer');
const UpperTransportLayer = require('./src/layers/upper-transport-layer');
const AccessLayer = require('./src/layers/access-layer');
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
accessLayer.on('outgoing', accessMessage => {
  upperLayer.handleOutgoing(accessMessage);
});
upperLayer.on('outgoing', lowerTransportMessage => {
  lowerLayer.handleOutgoing(lowerTransportMessage);
});
lowerLayer.on('outgoing', networkMessage => {
  networkLayer.handleOutgoing(networkMessage);
});

accessLayer.on('incoming', message => {
  console.log(JSON.stringify(message, null, 2));
});

networkLayer.handleIncoming(Buffer.from(process.argv[2], 'hex'));
