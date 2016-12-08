'use strict';

const assert = require('assert'),
    it = require('mocha').it,
    describe = require('mocha').describe,
    path = require('path'),
    Dispatcher = require('../src/Dispatcher');

describe('Parse', function () {
    this.timeout(4000000);
    it('# parse file', function (done) {
        let dispatcher = new Dispatcher(path.join('/Users/anthony/Documents/backup/me2day/garangnip/post'));
        //let dispatcher = new Dispatcher(path.join(__dirname, 'resource.html'));
        //dispatcher.debug();
        dispatcher.execute(()=>{
            done();
        });
    });
});