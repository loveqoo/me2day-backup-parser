'use strict';
const path = require('path');
const assert = require('assert');
const Migration = require('../src/helper/Migration');

describe('Migration Test', function () {
    this.timeout(10000);
    const migration = new Migration();
    migration.debug();
    it('# getMeta', function (done) {
        migration.getMeta().then((meta)=>{
            assert.notStrictEqual(meta, undefined, `meta is undefined.`);
            console.log(meta);
            done();
        });
    });

    it('# parse', function (done) {
        migration.transform('./test/post.hbs', (post, out)=>{
            console.log(out);
        }).then(()=>{
            done();
        });
    });
});