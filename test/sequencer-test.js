const assert = require('assert');
const it = require('mocha').it;
const describe = require('mocha').describe;
const sequencer = require('../src/sequencer')();

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
        Promise.all([get(),get(),get(),get()]).then((values)=> {
            console.log(values);
            done();
        }).catch((error) => {
            console.log(error);
            done();
        });
    });
    it('#get twice()', (done) => {
        Promise.all([get(),get(),get(),get()]).then((values)=> {
            console.log(values);
            done();
        }).catch((error) => {
            console.log(error);
            done();
        });
    });
});
