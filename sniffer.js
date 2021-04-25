const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

const NetworkLayer = require('./src/layers/network-layer');
const LowerTransportLayer = require('./src/layers/lower-transport-layer');
const UpperTransportLayer = require('./src/layers/upper-transport-layer');
const AccessLayer = require('./src/layers/access-layer');
const SeqProvider = require('./src/utils/seq-provider');
const Keychain = require('./src/keychain');
require('./src/utils/add-debug-formatters');

SeqProvider.setTransient(true);

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
  console.log(new Date().toISOString(), JSON.stringify(message, null, 2));
});

const [path] = process.argv.slice(2);
const port = new SerialPort(path, { baudRate: 115200 });

const parser = new Readline();
port.pipe(parser);

parser.on('data', line => {
  if (line === 'wheee') {
    console.log('Sniffer says', line);
    return;
  }
  const data = Buffer.from(line, 'hex');
  if (data.length < 2) {
    console.log('Dropping message too short');
    return;
  }
  const length = data.readUInt8(0);
  if (length !== data.length - 1) {
    console.log('Dropping message with a wrong length', length, data.length);
    return;
  }
  const type = data.readUInt8(1);
  if (type === 0x2a) {
    networkLayer.handleIncoming(data.slice(2));
  }
});

// const rl = networkLayer.handleIncoming(Buffer.from(process.argv[2], 'hex'));
