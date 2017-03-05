'use strict';
const path = require('path');
const assert = require('assert');
const Migration = require('../src/helper/Migration');

describe('Migration Test', function () {
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

    // it('# copyFiles', function (done) {
    //     const from = '/Users/anthony/Documents/backup/me2day/images';
    //     const to = '/Users/anthony/Documents/backup/me2day/images_copied';
    //     migration.copyFiles(from, to, ()=>{
    //         done();
    //     });
    // });
});