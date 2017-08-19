'use strict';
const path = require('path');
const assert = require('assert');
const Migration = require('../src/helper/Migration');

describe('Migration Test', function () {
    this.timeout(100000);
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
        let migrationConfig = {
          sourcePath: './test/post-only-text.hbs',
          rootPath: '/Users/anthony/Documents/migration/',
          getFolderPath : (post) => {
            let dateInfo = post.getDateInfo();
            return [dateInfo.year, dateInfo.month].join('');
          },
          getFileName: (post) => {
            let dateInfo = post.getDateInfo();
            let fileBaseName = post.title.trim().replace('...', '')
              .replace(/[.|,]/g, '')
              .replace(/[ ]+/g, '-') + '.md';
            return [dateInfo.year, dateInfo.month, dateInfo.day, fileBaseName].join('-');
          }
        };
        migration.transform(migrationConfig, (post, out)=>{
            //console.log(out);
            //throw new Error('');
        }).then(()=>{
            done();
        });
    });
});