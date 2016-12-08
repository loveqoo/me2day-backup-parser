'use strict';
const Dispatcher = require('./src/Dispatcher');

// -- fullPath: ${backup-root}/me2day/yourId/post

module.exports = function (fullPath, callback) {
    new Dispatcher(fullPath).execute(callback);
};