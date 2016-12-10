'use strict';
const Dispatcher = require('./src/Dispatcher');
const Repository = require('./src/Repository');
const Domain = require('./src/Domain');
const co = require('co');
const Me2day = Domain.Me2day;
const People = Domain.People;
const Post = Domain.Post;
const Tag = Domain.Tag;
const Comment = Domain.Comment;

module.exports = {
    parse(path, callback){
        new Dispatcher(path).execute(callback);
    },
    load(callback){
        let repository = new Repository();
        Me2day.prototype.repository = repository;
        repository.onLoad.Post = rawText => Post.fromJSON(rawText);
        repository.onLoad.Tag = rawText => Tag.fromJSON(rawText);
        repository.onLoad.Comment = rawText => Comment.fromJSON(rawText);
        repository.onLoad.People = rawText => People.fromJSON(rawText);
        co(function*(){
            yield repository.load('Post', 'People', 'Tag', 'Comment');
        }).catch((e)=>{
            console.log(e);
        }).then(()=>{
            callback();
            console.log(repository.toString());
        });
        return repository;
    }
};