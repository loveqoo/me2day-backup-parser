const assert = require('assert');
const sequencer = require('../src/sequencer');
const _ = require('lodash');

sequencer.debug();

describe('sequencer', () => {
  const key = 'sample-key';
  const get = () => {
    return new Promise((fulfill) => {
      sequencer.get(key, (seq) => {
        fulfill(seq);
      });
    });
  };
  it('#get()', (done) => {
    Promise.all([get(), get(), get(), get()]).then((values) => {
      assert.equal(values.length, _.uniq(values).length);
      done();
    }).catch((error) => {
      console.log(error);
      done();
    });
  });
  it('#get twice()', (done) => {
    Promise.all([get(), get(), get(), get()]).then((values) => {
      assert.equal(values.length, _.uniq(values).length);
      done();
    }).catch((error) => {
      console.log(error);
      done();
    });
  });
});
