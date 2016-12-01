const fs = require('fs');
const path = require('path');
const co = require('co');

const throwError = function (msg = 'invalid parameter') {
  throw new Error(msg);
};

const defaultFileName = 'sequencer.json';
const defaultEncoding = 'utf-8';

const sequencer = function (fileName = defaultFileName) {
  let data = undefined, filePath = path.join(__dirname, fileName),
    promises = {
      existFile(filePath) {
        return new Promise((fulfill, reject) => {
          fs.access(filePath, fs.constants.R_OK, function (err) {
            if (err) {
              reject(err);
            } else {
              fulfill();
            }
          });
        }).catch(() => { console.log(`[INFO] ${filePath} is not exist.`);});
      },
      readFile(filePath){
        return new Promise((fulfill, reject) => {
          fs.readFile(filePath, defaultEncoding, (err, data) => {
            if (err) {
              reject(err);
            } else {
              fulfill(JSON.parse(data));
              console.log(`[INFO] ${filePath} is loaded.`);
            }
          });
        }).catch((err) => {});
      },
      writeFile(filePath) {
        return new Promise((fulfill, reject) => {
          fs.writeFile(filePath, JSON.stringify(data), defaultEncoding, (err) => {
            if (err) {
              reject(err);
            } else {
              console.log(`[INFO] ${filePath} is saved.`);
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
              console.log(`[INFO] ${filePath} is removed.`);
            }
          });
        });
      }
    },
    ready = function (key, callback) {
      if (data) {
        callback && (typeof callback === 'function') && callback(data);
        return;
      }
      co(function *() {
        try {
          yield promises.existFile(filePath);
          return yield promises.readFile(filePath);
        } catch (e) {
          console.log(e);
          return Promise.resolve({});
        }
      }).then((prevData) => {
        data = prevData || {};
        callback && (typeof callback === 'function') && callback(data);
      }).catch((err) => {
        console.log(err);
      });
    },
    get = function (key, callback) {
      !(key) && throwError('invalid key');
      !(callback && typeof callback === 'function') && throwError('invalid callback');
      ready(key, function (data) {
        if (data[key]) {
          data[key] += 1;
          callback(data[key]);
        } else {
          data[key] = 1;
          callback(1);
        }
      });
    },
    load = function (callback) {
      co(function *() {
        try {
          yield promises.existFile(filePath);
        } catch (e) {
          console.log(`${filePath} is not exists.`);
        }
        try {
          return promises.readFile(filePath);
        } catch(e) {
          console.log(e);
        }
      }).then((prevData) => {
        data = prevData;
        callback && (typeof callback === 'function') && callback();
      }).catch((err) => {
        console.log(err);
      });
    },
    save = function (callback) {
      co(function *() {
        try {
          yield promises.removeFile(filePath);
        } catch (e) {
          console.log(`${filePath} is not exists.`);
        }
        try {
          yield promises.writeFile(filePath);
        } catch (e) {
          console.log(e);
          return Promise.resolve();
        }
      }).then(() => {
        callback && (typeof callback === 'function') && callback();
      }).catch((err) => {
        console.log(err);
      });
    };
  return {
    get: get,
    save: save,
    load: load
  };
};

module.exports = sequencer;
