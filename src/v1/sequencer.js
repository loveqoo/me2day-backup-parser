'use strict';

const fs = require('fs');
const path = require('path');
const co = require('co');
const promises = require('./promises');

// const defaultFileName = 'sequencer.json';
// const throwError = (msg = 'invalid parameter') => {
//     throw new Error(msg);
// };

class Sequencer {
    constructor() {
        this.data = undefined;
        this.defaultEncoding = 'utf-8';
        this.defaultFilePath = path.join(__dirname, 'sequencer.json');
        this.debugMode = false;
        this.ready();
    }

    ready() {
        co.call(this, function *() {
            let isExist = yield this.isExist();
            if (isExist) {
                this.data = JSON.parse(yield this.getData());
            } else {
                this.data = {};
            }
        }).catch((e)=>{
            this.log(e);
        });
    }

    get(key) {
        return new Promise((fulfill)=> {
            if (this.data[key]) {
                this.data[key] += 1;
            } else {
                this.data[key] = 1;
            }
            fulfill(this.data[key]);
        }).catch((e)=>{
            this.log(e);
        });
    }

    save() {
        return new Promise((fulfill, reject) => {
            fs.writeFile(this.defaultFilePath, JSON.stringify(this.data), this.defaultEncoding, (e) => {
                if (e) {
                    reject(e);
                    this.log(`[INFO] ${this.defaultFilePath} could NOT saved.`);
                } else {
                    this.log(`[INFO] ${this.defaultFilePath} is saved.`);
                    fulfill();
                }
            });
        });
    }

    isExist() {
        return new Promise((fulfill) => {
            fs.access(this.defaultFilePath, fs.constants.R_OK, (e) => {
                if (e) {
                    fulfill(false);
                    this.log(`[INFO] ${this.defaultFilePath} is NOT exists.`);
                } else {
                    fulfill(true);
                    this.log(`[INFO] ${this.defaultFilePath} is exists.`);
                }
            });
        });
    }

    getData() {
        return new Promise((fulfill, reject) => {
            fs.readFile(this.defaultFilePath, this.defaultEncoding, (e, data) => {
                if (e) {
                    reject(e);
                    this.log(`[INFO] ${this.defaultFilePath} is NOT loaded.`);
                } else {
                    fulfill(data);
                    this.log(`[INFO] ${this.defaultFilePath} is loaded.`);
                }
            });
        });
    }

    log(msg) {
        msg && this.debugMode && console.log(msg);
    }
}

// const sequencer = ((fileName = defaultFileName) => {
//     let data = undefined, filePath = path.join(__dirname, fileName), debugMode = false,
//         debug = () => {
//             debugMode = !debugMode;
//         },
//         ready = (callback) => {
//             if (data) {
//                 callback && (typeof callback === 'function') && callback(data);
//                 return;
//             }
//             co(function *() {
//                 try {
//                     yield promises.existFile(filePath);
//                     return yield promises.readFile(filePath);
//                 } catch (e) {
//                     debugMode && console.log(e);
//                     return yield Promise.resolve({});
//                 }
//             }).then((prevData) => {
//                 data = prevData || {};
//                 callback && (typeof callback === 'function') && callback();
//             }).catch((err) => {
//                 debugMode && console.log(err);
//             });
//         },
//         addAndGet = (key, callback) => {
//             if (data[key]) {
//                 data[key] += 1;
//                 let seq = data[key];
//                 callback(seq);
//             } else {
//                 data[key] = 1;
//                 callback(1);
//             }
//         },
//         get = (key, callback) => {
//             !(key) && throwError('invalid key');
//             !(callback && typeof callback === 'function') && throwError('invalid callback');
//             if (data) {
//                 addAndGet(key, callback);
//                 return;
//             }
//             ready(() => {
//                 addAndGet(key, callback);
//             });
//         },
//         save = (callback) => {
//             co(function *() {
//                 try {
//                     yield promises.removeFile(filePath);
//                 } catch (e) {
//                     debugMode && console.log(`${filePath} is not exists.`);
//                 }
//                 try {
//                     yield promises.writeFile(filePath);
//                 } catch (e) {
//                     debugMode && console.log(e);
//                     return yield Promise.resolve();
//                 }
//             }).then(() => {
//                 callback && (typeof callback === 'function') && callback();
//             }).catch((err) => {
//                 debugMode && console.log(err);
//             });
//         };
//     ready(()=> {
//     });
//     return {
//         get: get,
//         save: save,
//         debug: debug
//     };
// })();

module.exports = Sequencer;
