'use strict';
const path = require('path');
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
  extractIdList (objectList, callback = () => {}) {
    let result = [];
    for (let obj of objectList) {
      callback(obj);
      result.push(obj['id']);
    }
    return result;
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
      parsed.forEach((str, index) => {
        if (index < validLength) {
          temp.push(str);
        }
      });
      peopleId = temp.join('_');
    }
    return peopleId;
  },
  save(repository, targetMap){
    return co(function *(){
      let savePromiseList = [];
      for (let key of Object.keys(targetMap)) {
        let value = targetMap[key];
        if (Array.isArray(value)) {
          for (let valueItem of value) {
            savePromiseList.push(co(function *(){
              yield repository.set(key, valueItem.id, valueItem);
            }));
          }
        } else {
          savePromiseList.push(co(function *(){
            yield repository.set(key, value.id, value);
          }));
        }
      }
      return yield savePromiseList;
    });
  }
};

const relate = {
  postAndPeople(post, people){
    post.writerId = people.id;
    people.postIdList.push(post.id);
  },
  postAndTags(post, tags){
    post.tagIdList = util.extractIdList(tags, (tag) => {
      tag.postIdList.push(post.id);
    });
  },
  postAndMetooPeopleList(post, metooPeopleList) {
    post.metooPeopleIdList = util.extractIdList(metooPeopleList, (people) => {
      people.metooPostIdList.push(post.id);
    });
  },
  postAndCommentList(post, commentList){
    post.commentIdList = util.extractIdList(commentList, (comment) => {
      comment.postId = post.id;
    })
  },
  commentAndPeople(comment, people){
    comment.writerId = people.id;
    people.commentIdList.push(comment.id);
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
    this.id = id;
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
    this.imageList = [];
  }
}
const sequencer = new Sequencer(), repository = new Repository();

const getPost = ($, resourcePath) => {
  return co(function *() {
    let post = yield repository.getOne('Post', (target) => {
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
    $('a.per_img.photo').each((idx, anchor)=> {
      let $anchor = $(anchor), $image = $anchor.find('img');
      post.imageList.push({
        thumbnail: path.join(resourcePath, '..', $image.attr('src')),
        original: path.join(resourcePath, '..', $anchor.attr('href'))
      });
    });
    return post;
  });
};

const getPeople = ($image) => {
  return co(function *() {
    let imagePath = $image.attr('src');
    let peopleId = util.extractPeopleIdByImageUri(imagePath);
    let people = yield repository.get('People', peopleId);
    if (people) {
      return people;
    }
    people = new People(peopleId);
    people.nickname = $image.attr('alt');
    people.profileImagePath = imagePath;
    yield repository.set('People', people.id, people);
    return people;
  });
};

const getMetooPeopleList = ($) => {
  return co(function *() {
    let metooList = [], $metooPeopleImageList = $('a.pi_s.profile_popup.no_link img');
    $metooPeopleImageList.each((idx, image)=>{
      let $image = $(image);
      metooList.push(Promise.resolve(getPeople($image)));
    });
    return yield metooList;
  });
};

const getTag = (tagText)=> {
  return co(function *(){
    let trimmed = tagText.trim();
    if (!trimmed) {
      return;
    }
    let tag = yield repository.getOne('Tag', (target) => {
      return target.content === trimmed;
    });
    if (tag) {
      return tag;
    }
    tag = new Tag(yield sequencer.get('Tag'));
    tag.content = trimmed;
    yield repository.set('Tag', tag.id, tag);
    return tag;
  });
};

const getTags = ($) => {
  return co(function *() {
    let tagPromiseList = [], tagTextList = $('p.post_tag').text().replace(/[;|\/|\_|\-|\.]/g, '').split(' ');
    for (let tagText of tagTextList) {
      tagPromiseList.push(getTag(tagText));
    }
    let tagList = yield tagPromiseList;
    return tagList.filter((tag)=> { return typeof tag !== 'undefined';});
  });
};

const getComment = ($comment)=> {
  return co(function *(){
    let comment = new Comment(yield sequencer.get('Comment'));
    comment.content = toMarkdown($comment.find('p.para').html());
    comment.timestamp = util.toTimestamp($comment.find('span.comment_time').text());
    let writer = yield getPeople($comment.find('a.comment_profile.profile_popup.no_link img'));
    relate.commentAndPeople(comment, writer);
    yield repository.set('People', writer.id, writer);
    return [comment, writer];
  });
};

const getCommentList = ($) => {
  return co(function *() {
    let commentPromiseList = [], $commentItemList = $('div.comment_item');
    $commentItemList.each((idx, commentItem)=>{
      commentPromiseList.push(getComment($(commentItem)));
    });
    let commandWriterList = yield commentPromiseList,
      commentList = [], writerList = [];
    for (let commandWriter of commandWriterList) {
      commentList.push(commandWriter[0]);
      writerList.push(commandWriter[1]);
    }
    return [commentList, writerList];
  });
};

module.exports = ($, resourcePath) => {
  return co(function *() {
    yield [sequencer.load(), repository.load(['Post', 'People', 'Comment', 'Tag'])];

    let post = yield getPost($, resourcePath);

    let writer = yield getPeople($('img.profile_img'));
    relate.postAndPeople(post, writer);
    yield repository.set('People', writer.id, writer);

    let tags = yield getTags($);
    relate.postAndTags(post, tags);
    yield util.save(repository, {Tag: tags});

    let metooPeopleList = yield getMetooPeopleList($);
    relate.postAndMetooPeopleList(post, metooPeopleList);
    yield util.save(repository, {People: metooPeopleList});

    let [commentList, writerList] = yield getCommentList($);
    relate.postAndCommentList(post, commentList);
    yield util.save(repository, {Comment: commentList});
    yield util.save(repository, {People: writerList});

    yield repository.set('Post', post.id, post);

    yield sequencer.save();
    yield repository.save();

    return post;
  });
};