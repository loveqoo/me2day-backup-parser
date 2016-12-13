'use strict';
const FileExplorer = require('../src/FileExplorer');

describe('Explorer Test', function () {
    this.timeout(10000);
    const fileExplorer = new FileExplorer();
    it('# explorer', function (done) {
        //fileExplorer.debug();
        let report = {dir: {}, ext:{}};
        fileExplorer.explore('/Users/anthony/Documents/backup/me2day', report).then(() => {
            let fileCount = 0;
            for (let key of Object.keys(report.dir)) {
                fileCount += report.dir[key];
                console.log(`${key} has ${report.dir[key]} html files.`)
            }
            console.log(`[TOTAL] It has ${fileCount} html files.`);
            for (let extName of Object.keys(report.ext)) {
                console.log(`${extName} is ${report.ext[extName]}`);
            }
            done();
        });
    });
});