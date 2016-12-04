const assert = require('assert');
const sequencer = require('../src/v1/sequencer');
const _ = require('lodash');
const cluster = require('cluster');

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
        Promise.all([get(), get(), get(), get(), get(), get(), get(), get()]).then((values) => {
            //console.log(values);
            assert.equal(values.length, _.uniq(values).length);
            done();
        }).catch((error) => {
            console.log(error);
            done();
        });
    });
});
