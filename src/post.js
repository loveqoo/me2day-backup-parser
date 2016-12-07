'use strict';
const toMarkdown = require('to-markdown');
const Repository = require('./v1/repository');
const Sequencer = require('./v1/sequencer');
const co = require('co');

const util = {
  toTimestamp(timestampText) {
    return new Date('20' + timestampText.replace('.', '-').replace('.', '-').replace(' ', 'T') + ':00+09:00');
  },
  toContent(rawText) {
    return toMarkdown(rawText.replace(/\<span class\=\"post_permalink\"\>.+\<\/span\>/gi, ''));
  },
  extractPeopleIdByImageUri (imageUri) {
    let regex = new RegExp("/img/images/user/(.+)/profile.png"), peopleId;
    if (imageUri.includes('/img/images/user/')) {
      var parsed = regex.exec(imageUri);
      if (parsed.length > 1) {
        peopleId = parsed[1];
      }
    } else {
      var parsed = imageUri.split('/')[3].split('_'),
        validLength = parsed.length - 2,
        temp = [];
      parsed.forEach((str, index)=> {
        if (index < validLength) {
          temp.push(str);
        }
      });
      peopleId = temp.join('_');
    }
    return peopleId;
  }
};

class People {
  constructor(id) {
    this.id = id;
    this.profileImagePath;
    this.postIdList = [];
    this.commentIdList = [];
    this.metooPostIdList = [];
  }
}

class Tag {
  constructor(id) {
    this.id;
    this.content;
    this.postIdList = [];
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
    this.resourcePath;
    this.metooPeopleIdList = [];
    this.timestamp;
    this.title;
    this.content;
    this.tagIdList = [];
    this.commentIdList = [];
  }
}
const sequencer = new Sequencer(), repository = new Repository();

const getPost = ($, resourcePath)=> {
  return co(function *(){
    let post = yield repository.getOne('Post', (target)=>{
      return target.resourcePath === resourcePath;
    });
    if (post) {
      return post;
    }
    post = new Post(yield sequencer.get('Post'));
    post.resourcePath = resourcePath;
    post.timestamp = util.toTimestamp($('span.post_permalink').html());
    post.content = util.toContent($('p.post_body').html());
    post.title = post.content.length > 30 ? post.content.substring(0, 30) + '...' : post.content;
    return post;
  });
};
const getPeople = ($image)=> {
  return co(function *(){
    let imagePath = $image.attr('src');
    let peopleId = util.extractPeopleIdByImageUri(imagePath);
    let people = yield repository.get('People', peopleId);
    if (people) {
      return people;
    }
    people = new People(peopleId);
    people.nickname = $image.attr('alt');
    people.profileImagePath = imagePath;
    return people;
  });
};

const getTags = ($)=> {
  return co(function *(){
    let tagList = [], tagTextList = $.find('p.post_tag').text().replace(/[;|\/|\_|\-|\.]/g, '').split(' ');
    for (let tagText of tagTextList) {
      let trimmed = tagText.trim();
      if (!trimmed) {
        continue;
      }
      let tag = repository.getOne('Tag', (target)=> {
        return target.content === trimmed;
      });
      if (tag) {
        tagList.push(tag);
        continue;
      }
      tag = new Tag(yield sequencer.get('Tag'));
      tag.content = trimmed;
      tagList.push(tag);
    }
    return tagList;
  });
};

module.exports = ($, resourcePath) => {
  return co(function *(){
      yield [sequencer.load(), repository.load(['Post', 'People', 'Comment', 'Tag'])];
      let post = yield getPost($, resourcePath);
      let writer = yield getPeople($.find('img.profile_img'));
      let tags = yield getTags($);
      post.writerId = writer.id;
      writer.postIdList.push(post.id);


      return post;
  });
};