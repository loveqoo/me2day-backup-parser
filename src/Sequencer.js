'use strict';

const path = require('path');
const AsyncFsRunnable = require('./defines/AsyncFsRunnable');

class Sequencer extends AsyncFsRunnable {
    constructor() {
        super();
        this.pwd = process.env.PWD;
        this.defaultFolderName = '.repo';
        this.defaultDirPath = path.join(this.pwd, this.defaultFolderName);
        this.defaultFilePath = path.join(this.defaultDirPath, 'sequence.json');
    }

    get(key) {
        !(this.data) && this.throwError(`The load() must be executed first.`);
        return new Promise((fulfill)=> {
            if (this.data[key]) {
                this.data[key] += 1;
            } else {
                this.data[key] = 1;
            }
            fulfill(this.data[key]);
        }).catch((e)=> {
            this.log(e);
        });
    }

    load() {
        return this.run(function *() {
            let isExist = yield this.isExist(this.defaultFilePath);
            if (isExist) {
                let prevRawData = yield this.readFile(this.defaultFilePath);
                this.data = prevRawData ? JSON.parse(prevRawData) : {};
            } else {
                this.data = {};
            }
        });
    }

    save() {
        !(this.data) && this.throwError(`The load() must be executed first.`);
        return this.run(function *(){
            let isExist = yield this.isExist(this.defaultDirPath);
            if (!isExist) {
                yield this.createDirectory(this.defaultDirPath);
            }
            yield this.writeFile(this.defaultFilePath, JSON.stringify(this.data));
        });
    }
}

module.exports = Sequencer;
