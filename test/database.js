import test from "tape"
import parseBinaryDatabase from "../lib/decoding/parseBinaryDatabase.js"

function generateHeader(type, id) {
  const header = new Buffer(5);
  header.writeInt8(type, 0);
  header.writeInt32LE(id, 1);
  return header;
}

function floatEqual(a, b, delta = 2) {
  return a > b ? (b - a <= delta) : (a - b <= delta);
}

function toBinaryBuffer(str) {
  const buf = new Buffer(str.length + 1);
  for (let i = 0; i < str.length; i++) {
    buf.writeUInt8(str.charCodeAt(i), i);
  }
  buf.writeUInt8(0, str.length);
  return buf
}

function dictBinaryBuffer(dict) {
  const res = [
    new Buffer(2)
  ];

  for (let key in dict) {
    if (dict.hasOwnProperty(key)) {
      const id = new Buffer(4);
      id.writeUInt32LE(parseInt(key), 0);
      res.push(Buffer.concat([
        id,
        toBinaryBuffer(dict[key])
      ]));
    }
  }

  res[0].writeUInt16LE(res.length - 1, 0);
  return Buffer.concat(res);
}

function arrayBinaryBuffer(dict) {
  const res = [
    new Buffer(2)
  ];

  for (let x of dict) {
    const buf = new Buffer(4);
    buf.writeUInt32LE(x, 0);
    res.push(buf);
  }

  res[0].writeUInt16LE(res.length - 1, 0);
  return Buffer.concat(res);
}

test("Test decoding booleans", t => {
  t.plan(1);

  const id = 42;
  const ident = generateHeader(0, id);

  const buf = new Buffer(1);
  buf.writeInt8(1, 0);

  const res = parseBinaryDatabase(Buffer.concat([
    ident,
    buf
  ]));

  t.equal(res[id.toString()], true);
});

test("Test decoding signed int8", t => {
  t.plan(1);

  const id = 42;
  const val = -36;

  const ident = generateHeader(1, id);

  const buf = new Buffer(1);
  buf.writeInt8(val, 0);

  const res = parseBinaryDatabase(Buffer.concat([
    ident,
    buf
  ]));

  t.equal(res[id.toString()], val);
});

test("Test decoding unsigned int8", t => {
  t.plan(1);

  const id = 42;
  const val = 36;

  const ident = generateHeader(2, id);

  const buf = new Buffer(1);
  buf.writeUInt8(val, 0);

  const res = parseBinaryDatabase(Buffer.concat([
    ident,
    buf
  ]));

  t.equal(res[id.toString()], val);
});

test("Test decoding signed int32", t => {
  t.plan(1);

  const id = 42;
  const val = -543;

  const ident = generateHeader(3, id);

  const buf = new Buffer(4);
  buf.writeInt32LE(val, 0);

  const res = parseBinaryDatabase(Buffer.concat([
    ident,
    buf
  ]));

  t.equal(res[id.toString()], val);
});

test("Test decoding unsigned int32", t => {
  t.plan(1);

  const id = 42;
  const val = 543;

  const ident = generateHeader(4, id);

  const buf = new Buffer(4);
  buf.writeUInt32LE(val, 0);

  const res = parseBinaryDatabase(Buffer.concat([
    ident,
    buf
  ]));

  t.equal(res[id.toString()], val);
});

test("Test decoding float32", t => {
  t.plan(1);

  const id = 42;
  const val = 500 / 3;

  const ident = generateHeader(5, id);

  const buf = new Buffer(4);
  buf.writeFloatLE(val, 0);

  const res = parseBinaryDatabase(Buffer.concat([
    ident,
    buf
  ]));

  t.assert(floatEqual(res[id.toString()], val, 0.1));
});

test("Test decoding strings", t => {
  t.plan(1);

  const id = 42;
  const val = "Hello World";

  const ident = generateHeader(6, id);

  const res = parseBinaryDatabase(Buffer.concat([
    ident,
    toBinaryBuffer(val)
  ]));

  t.equal(res[id.toString()], val);
});

test("Test decoding lists", t => {
  t.plan(1);

  const id = 42;
  const val = [
    43,
    44,
    45,
    46
  ];

  const ident = generateHeader(7, id);

  const buf = new Buffer(val.length * 4 + 2);
  buf.writeUInt16LE(val.length, 0);

  let cursor = 2;
  for (let x of val) {
    buf.writeUInt32LE(x, cursor);
    cursor += 4;
  }

  const res = parseBinaryDatabase(Buffer.concat([
    ident,
    buf
  ]));

  t.deepEqual(res[id.toString()], val);
});

test("Test decoding key/val modifications", t => {
  t.plan(2);

  const id = 42;

  const insert = {
    46: "Hello",
    57: "World"
  };
  const remove = [
    43,
    44,
    45
  ];

  const ident = generateHeader(8, id);

  const res = parseBinaryDatabase(Buffer.concat([
    ident,
    dictBinaryBuffer(insert),
    arrayBinaryBuffer(remove)
  ]));

  const temp = res[id.toString()];
  t.deepEqual(temp.insert, {
    'Hello': '46',
    'World': '57'
  });
  t.deepEqual(temp.remove, remove.map(x => x.toString()));
});
