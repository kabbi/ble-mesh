// @flow
const fs = require('fs');

const FileName = '.seqs';

const map: Map<string, number> = new Map();
let transient = false;

const load = () => {
  if (!fs.existsSync(FileName)) {
    return;
  }
  const data = fs.readFileSync(FileName, 'utf8');
  for (const [key, value] of Object.entries(JSON.parse(data))) {
    map.set(key, ((value: any): number));
  }
};

const save = () => {
  const data = JSON.stringify(Object.fromEntries(map.entries()), null, 2);
  fs.writeFileSync(FileName, data);
};

load();

exports.setTransient = (flag: boolean) => {
  transient = flag;
};

exports.acceptSeq = (key: string, seq: number): boolean => {
  const current = map.get(key) || 0;
  if (seq <= current) {
    return false;
  }
  map.set(key, seq);
  if (!transient) {
    save();
  }
  return true;
};

exports.nextSeq = (key: string): number => {
  let current = map.get(key) || 0;
  current += 1;
  map.set(key, current);
  if (!transient) {
    save();
  }
  return current;
};
