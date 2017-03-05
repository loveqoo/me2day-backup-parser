'use strict';
const Dispatcher = require('./src/Dispatcher');
const ResourceFactory = require('./src/ResourceFactory');
const Migration = require('./src/helper/Migration');
const co = require('co');

module.exports = {
    parse(path, callback){
        new Dispatcher(path).execute(callback);
    },
    load(callback){
        const factory = new ResourceFactory();
        let repository = factory.repository;
        co(function*(){
            yield repository.load('Post', 'People', 'Tag', 'Comment');
        }).catch((e)=>{
            console.log(e);
        }).then(()=>{
            callback();
            console.log(repository.toString());
        });
        return repository;
    },
    migration(templatePath, callback){
        new Migration().transform(templatePath, callback);
    }
};