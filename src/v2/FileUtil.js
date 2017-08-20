'use strict';
const fs = require('graceful-fs');

const getStats = async (targetPath, callback) => {
    return await new Promise((resolve, reject) => {
      fs.stat(targetPath, (err, stats) => {
        if (err) {
          reject(err);
        } else {
          resolve(callback ? callback(stats) : stats);
        }
      });
    });
  },
  isExist = async (targetPath) => {
    return await new Promise((resolve) => {
      fs.access(targetPath, fs.constants.R_OK, (e) => {
        resolve(!e);
      });
    });
  };


module.exports = {
  getStats: getStats
};