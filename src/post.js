const toMarkdown = require('to-markdown');
const repository = require('./v1/repository');
const sequencer = require('./v1/sequencer');
const memoryRepository = repository.memory();
const fileRepository = repository.file();

const util = {
    toTimestamp(timestampText) {
        return new Date('20' + timestampText.replace('.', '-').replace('.', '-').replace(' ', 'T') + ':00+09:00');
    },
    toContent(rawText) {
        return toMarkdown(rawText.replace(/\<span class\=\"post_permalink\"\>.+\<\/span\>/gi, ''));
    }
};

class Person {
    constructor(id) {
        this.id = id;
        this.postIdList;
        this.commentIdList;
        this.metooPostIdList;
    }
}

class Tag {
    constructor(id) {
        this.id;
        this.content;
        this.postIdList;
    }
}

class Comment {
    constructor(id) {
        this.id = id;
        this.writerId;
        this.timestamp;
        this.content;
    }
}

class Post {
    constructor(id) {
        this.id = id;
        this.writerId;
        this.metooPeopleIdList;
        this.timestamp;
        this.content;
        this.tagIdList;
        this.commentIdList;
    }

    static getPost($, resourcePath) {
        // let $container = $('div#container');
        // let $postBody = $('p.post_body');
        let post = memoryRepository.getOne('Post', (post)=> {
            return post.resourcePath === resourcePath;
        });
        if (post) {
            return post;
        }
        post = new Post(1);
        post.resourcePath = resourcePath;
        post.timestamp = util.toTimestamp($('span.post_permalink').html());
        post.content = util.toContent($('p.post_body').html());
        return post;
    }
}

module.exports = Post;