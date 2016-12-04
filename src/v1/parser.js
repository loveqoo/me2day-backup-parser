"use strict";
const fs = require('fs');
const path = require('path');
const repository = require('./repository');
const sequencer = require('./sequencer');
const promises = require('./promises');
const context = require('./context');
const cheerio = require('cheerio');
const toMarkdown = require('to-markdown');
const co = require('co');

const me2day = require('./me2day');
const memoryRepository = repository.memory();
const fileRepository = repository.file();

const throwError = (msg) => {
    throw new Error(msg || 'invalid parameter');
};

module.exports = () => {
    let getCheerio = (resourcePath) => {
        !(resourcePath) && throwError();
        return new Promise((fulfill, reject) => {
            fs.access(resourcePath, fs.constants.R_OK, (err) => {
                if (err) {
                    reject(err);
                } else {
                    fulfill();
                }
            });
        }).then(()=> {
            return new Promise((fulfill, reject)=> {
                fs.readFile(resourcePath, 'utf-8', (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        fulfill(data);
                    }
                });
            });
        }).then((data) => {
            return new Promise.resolve(cheerio.load(data, {normalizeWhitespace: true}));
        });
    };
    return {}
};

const parser = {
    directory (context, callback) {
        !(context && context.get('config') && context.get('resourcePath')) && throwError();
        var directoryPath = context.get('resourcePath');

        promises.readDirectory(directoryPath).then((files)=> {
            files.forEach((fileName) => {
                if (path.extname(fileName) !== '.html') {
                    return;
                }
                context.set('resourcePath', path.join(directoryPath, fileName));
                parser.file(context, callback);
            });
        }).catch((err)=> {
            console.log(err);
        });
    },
    file (context, callback) {
        !(context && context.get('resourcePath')) && throwError();

        // var postResourcePath = path.basename(context.get('resourcePath'));
        // var samePosts = Me2day.repository.list(Me2day.domain.Post, function (post) {
        //     return post.sourcePath === postResourcePath;
        // });
        // if (samePosts && samePosts.length > 0) {
        //     context.get('debug', false) && console.log('[WARN] Post(' + samePosts[0].id + ') is already parsed, ignored.');
        //     return;
        // }

        parser.getCheerio(context.get('resourcePath'))
            .then(($) => {
                context.set('$', $);
                context.set('$container', $('div#container'));
                var post = parser.getPost(context);
                callback && (typeof callback === 'function') && callback(post, context);
            }).catch((err)=> {
            console.log(err);
        });
    },
    getCheerio (resourcePath) {
        !(resourcePath) && throwError();
        return co(function *() {
            try {
                yield promises.existFile(resourcePath);
                return yield promises.readFile(resourcePath);
            } catch (e) {
                console.log(e);
            }
        }).then((data)=> {
            return yield Promise.resolve(cheerio.load(data, {normalizeWhitespace: true}));
        }).catch((err)=> {
            console.log(err);
        });
    },
    getPost: function (context) {
        !(context && context.get('$') && context.get('repository') && context.get('$container')) && throwError();
        var $ = context.get('$');
        var repository = context.get('repository');
        var $container = context.get('$container');

        var $postBody = $container.find('p.post_body');
        var $timestamp = $postBody.find('span.post_permalink');

        var post = new me2day.domain.Post();
        post.sourcePath = path.basename(context.get('resourcePath'));
        post.text = toMarkdown(me2day.util.extractContent($postBody.html()));
        post.timestamp = me2day.util.parseDate($timestamp.html());

        var title = $('<p>' + me2day.util.extractContent($postBody.html()) + '</p>').text().trim();
        post.title = title > 30 ? title.substring(0, 30) + '...' : title;

        var author = parser.getAuthor(context);
        Me2day.graph.postAndPeople(post, author);

        var tagList = parser.getTagList(context);
        Me2day.graph.postAndTagList(post, tagList);

        var metooPeopleList = parser.getMetooPeopleList(context);
        Me2day.graph.postAndMetooPeopleList(post, metooPeopleList);

        var commentList = parser.getCommentList(context);
        Me2day.graph.postAndCommentList(post, commentList);

        post.imageList = parser.getImageList(context);

        fileRepository.set(me2day.domain.Post, post);
        return post;
    },
    getAuthor: function (context) {
        !(context && context.get('$') && context.get('repository') && context.get('$container')) && error();
        var $container = context.get('$container');
        var $image = $container.find('img.profile_img'),
            peopleId = me2day.util.extractPeopleIdByImageUri($image.attr('src'));
        return me2day.util.getPeople(peopleId, $image.attr('src'), $image.attr('alt'), context);
    },
    getTagList: function (context) {
        !(context && context.get('$') && context.get('repository') && context.get('$container')) && error();
        var $container = context.get('$container');

        var $tagBody = $container.find('p.post_tag');
        var tagTextList = $tagBody.text().replace(/[;|\/|\_|\-|\.]/g, '').split(' ');
        var tags = [];
        tagTextList.forEach(function (tagTextRaw) {
            var tagText = tagTextRaw.trim();
            if (!tagText) {
                return;
            }
            var tagList = memoryRepository.repository.list(me2day.domain.Tag.name, function (tag) {
                return tag.text === tagText;
            });
            if (tagList.length > 0) {
                tags.push(tagList[0]);
                return;
            }
            var tag = new me2day.domain.Tag(null, tagText);
            memoryRepository.set(me2day.domain.Tag.name, tag);
            tags.push(tag);
        });
        return tags;
    },
    getMetooPeopleList: function (context) {
        !(context && context.get('$') && context.get('repository') && context.get('$container')) && error();
        var $ = context.get('$');
        var $container = context.get('$container');
        var $metooContainer = $container.find('div.me2box.type_7');
        var $metooPeople = $metooContainer.find('a.pi_s.profile_popup.no_link img');
        var metooPeopleList = [];
        $metooPeople.each(function () {
            var $image = $(this);
            var peopleId = me2day.util.extractPeopleIdByImageUri($image.prop('src'));
            var people = me2day.util.getPeople(peopleId, $image.attr('src'), $image.attr('alt'), context);
            metooPeopleList.push(people);
        });
        return metooPeopleList;
    },
    getCommentList: function (context) {
        !(context && context.get('$') && context.get('repository') && context.get('$container')) && error();
        var $ = context.get('$');
        var $container = context.get('$container');

        var $commentContainer = $container.find('div.comments_list_wrap');
        var commentList = [];
        $commentContainer.find('div.comment_item').each(function () {
            var $comment = $(this),
                $image = $comment.find('a.comment_profile.profile_popup.no_link img'),
                $commentTimestamp = $comment.find('span.comment_time'),
                commentText = toMarkdown($comment.find('p.para').html()),
                peopleId = me2day.util.extractPeopleIdByImageUri($image.attr('src'));
            var people = me2day.util.getPeople(peopleId, $image.attr('src'), $image.attr('alt'), context);

            var comment = new me2day.domain.Comment();
            comment.timestamp = me2day.util.parseDate($commentTimestamp.text());
            comment.text = commentText;
            fileRepository.set(me2day.domain.Comment.name, comment, ()=>{});
            me2day.graph.commentAndPeople(comment, people);
            commentList.push(comment);
        });
        return commentList;
    },
    getImageList: function (context) {
        !(context && context.get('$') && context.get('resourcePath') && context.get('$container')) && error();
        var $ = context.get('$');
        var $container = context.get('$container');
        var resourcePath = context.get('resourcePath');

        var $imageContainer = $container.find('div.post_photo');
        if ($imageContainer.length === 0) {
            return [];
        }
        var imageList = [];
        $imageContainer.find('a.per_img.photo').each(function () {
            var $anchor = $(this), $image = $anchor.find('img');
            imageList.push({
                thumbnail: path.join(resourcePath, '..', $image.attr('src')),
                original: path.join(resourcePath, '..', $anchor.attr('href'))
            });
        });
        return imageList;
    }
};

module.exports = parser;