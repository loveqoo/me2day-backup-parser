'use strict';

const assert = require('assert'),
    it = require('mocha').it,
    describe = require('mocha').describe,
    path = require('path'),
    Dispatcher = require('../src/Dispatcher');

describe('Parse', function () {
    this.timeout(2000);
    it('# parse file', function (done) {
        let dispatcher = new Dispatcher(path.join(__dirname, 'resource.html'));
        dispatcher.debug();
        dispatcher.execute((result)=>{
            console.log('--- SUMMARY ---');
            console.log(`Post count: ${Object.keys(result.Post).length}`);
            console.log(`People count: ${Object.keys(result.People).length}`);
            console.log(`Tag count: ${Object.keys(result.Tag).length}`);
            console.log(`Comment count: ${Object.keys(result.Comment).length}`);
            if (Object.keys(result.Post).length > 0) {
                console.log('--- POST SAMPLE ---');
                console.log(result.Post[Object.keys(result.Post)[0]].toString());
            }
            done();
        });
    });
});