'use strict';

const path = require('path');
const AsyncFsRunnable = require('../AsyncFsRunnable');

class Sequencer extends AsyncFsRunnable {
    constructor() {
        super();
        this.defaultFilePath = path.join(__dirname, 'sequencer.json');
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
                this.data = JSON.parse(yield this.readFile(this.defaultFilePath));
            } else {
                this.data = {};
            }
        });
    }

    save() {
        !(this.data) && this.throwError(`The load() must be executed first.`);
        return this.writeFile(this.defaultFilePath, JSON.stringify(this.data));
    }
}

module.exports = Sequencer;
