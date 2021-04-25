const fs = require('fs');

const FileName = '.seqs';

const map = new Map();
const seen = new Set();
let transient = false;

const load = () => {
  if (!fs.existsSync(FileName)) {
    return;
  }
  const data = fs.readFileSync(FileName, 'utf8');
  for (const [key, value] of Object.entries(JSON.parse(data))) {
    map.set(key, value);
  }
};

const save = () => {
  const data = JSON.stringify(Object.fromEntries(map.entries()), null, 2);
  fs.writeFileSync(FileName, data);
};

load();

exports.setTransient = flag => {
  transient = flag;
};

exports.acceptSeq = (key, seq) => {
  const v = `${key}-${seq}`;
  if (seen.has(v)) {
    return false;
  }
  seen.add(v);
  return true;
};

exports.nextSeq = key => {
  let current = map.get(key) || 0;
  current += 1;
  map.set(key, current);
  if (!transient) {
    save();
  }
  return current;
};
