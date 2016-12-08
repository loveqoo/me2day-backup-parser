'use strict';
const Dispatcher = require('./src/Dispatcher');

module.exports = {
    parse(path, callback){
        new Dispatcher(path).execute(callback);
    }
};