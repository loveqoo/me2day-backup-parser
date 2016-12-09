'use strict';
const Dispatcher = require('./src/Dispatcher');
const Repository = require('./src/Repository');

module.exports = {
    parse(path, callback){
        new Dispatcher(path).execute(callback);
    },
    load(callback){
        let repository = new Repository();
        repository.load('Post', 'People', 'Tag', 'Comment').then(callback);
        return repository;
    }
};