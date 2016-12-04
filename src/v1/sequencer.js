'use strict';

const fs = require('fs');
const path = require('path');
const co = require('co');
const promises = require('./promises');

const defaultFileName = 'sequencer.json';
const throwError = (msg = 'invalid parameter') => {
    throw new Error(msg);
};

const sequencer = ((fileName = defaultFileName) => {
    let data = undefined, filePath = path.join(__dirname, fileName), debugMode = false,
        debug = () => {
            debugMode = !debugMode;
        },
        ready = (callback) => {
            if (data) {
                callback && (typeof callback === 'function') && callback(data);
                return;
            }
            co(function *() {
                try {
                    yield promises.existFile(filePath);
                    return yield promises.readFile(filePath);
                } catch (e) {
                    debugMode && console.log(e);
                    return yield Promise.resolve({});
                }
            }).then((prevData) => {
                data = prevData || {};
                callback && (typeof callback === 'function') && callback();
            }).catch((err) => {
                debugMode && console.log(err);
            });
        },
        addAndGet = (key, callback) => {
            if (data[key]) {
                data[key] += 1;
                let seq = data[key];
                callback(seq);
            } else {
                data[key] = 1;
                callback(1);
            }
        },
        get = (key, callback) => {
            !(key) && throwError('invalid key');
            !(callback && typeof callback === 'function') && throwError('invalid callback');
            if (data) {
                addAndGet(key, callback);
                return;
            }
            ready(() => {
                addAndGet(key, callback);
            });
        },
        save = (callback) => {
            co(function *() {
                try {
                    yield promises.removeFile(filePath);
                } catch (e) {
                    debugMode && console.log(`${filePath} is not exists.`);
                }
                try {
                    yield promises.writeFile(filePath);
                } catch (e) {
                    debugMode && console.log(e);
                    return yield Promise.resolve();
                }
            }).then(() => {
                callback && (typeof callback === 'function') && callback();
            }).catch((err) => {
                debugMode && console.log(err);
            });
        };
    ready(()=> {
    });
    return {
        get: get,
        save: save,
        debug: debug
    };
})();

module.exports = sequencer;
