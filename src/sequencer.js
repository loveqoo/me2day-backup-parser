'use strict';

const fs = require('fs');
const path = require('path');
const co = require('co');
const ReadWriteLock = require('rwlock');
const lock = new ReadWriteLock();

const defaultEncoding = 'utf-8';
const defaultFileName = 'sequencer.json';
const throwError = (msg = 'invalid parameter') => {
  throw new Error(msg);
};

const sequencer = ((fileName = defaultFileName) => {
  let data = undefined, filePath = path.join(__dirname, fileName), debugMode = false,
    promises = {
      existFile(filePath) {
        return new Promise((fulfill, reject) => {
          fs.access(filePath, fs.constants.R_OK, (err) => {
            if (err) {
              reject(err);
              debugMode && console.log(`[INFO] ${filePath} is NOT exist.`);
            } else {
              fulfill();
            }
          });
        });
      },
      readFile(filePath){
        return new Promise((fulfill, reject) => {
          fs.readFile(filePath, defaultEncoding, (err, data) => {
            if (err) {
              reject(err);
              debugMode && console.log(`[INFO] ${filePath} is NOT loaded.`);
            } else {
              fulfill(JSON.parse(data));
              debugMode && console.log(`[INFO] ${filePath} is loaded.`);
            }
          });
        });
      },
      writeFile(filePath) {
        return new Promise((fulfill, reject) => {
          fs.writeFile(filePath, JSON.stringify(data), defaultEncoding, (err) => {
            if (err) {
              reject(err);
              debugMode && console.log(`[INFO] ${filePath} could NOT saved.`);
            } else {
              debugMode && console.log(`[INFO] ${filePath} is saved.`);
              fulfill();
            }
          });
        });
      },
      removeFile(filePath) {
        return new Promise((fulfill, reject) => {
          fs.unlink(filePath, (err) => {
            if (err) {
              reject(err);
            } else {
              fulfill();
              debugMode && console.log(`[INFO] ${filePath} is removed.`);
            }
          });
        });
      }
    },
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
          return Promise.resolve({});
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
      lock.async.writeLock((error, release) => {
        if (error) {
          debugMode && console.log(`[ERROR] write lock`);
          relase();
          return;
        }
        if (data) {
          release();
          addAndGet(key, callback);
        } else {
          ready(() => {
            release();
            addAndGet(key, callback);
          });
        }
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
          return Promise.resolve();
        }
      }).then(() => {
        callback && (typeof callback === 'function') && callback();
      }).catch((err) => {
        debugMode && console.log(err);
      });
    };
  return {
    get: get,
    save: save,
    debug: debug
  };
})();

module.exports = sequencer;
