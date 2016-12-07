'use strict';

const assert = require('assert'),
    it = require('mocha').it,
    describe = require('mocha').describe,
    path = require('path'),
    Parser = require('../src/index');

describe('Parse', function () {
    this.timeout(40000);
    it('# parse file', function (done) {
        //let parser = new Parser(path.join('/Users/anthony/Documents/backup/me2day/garangnip/post'));
        let parser = new Parser(path.join(__dirname, 'resource.html'));
        parser.debug();
        parser.parse(()=>{
            done();
        });
    });
});