'use strict';
const path = require('path');
const toMarkdown = require('to-markdown');
const Repository = require('./Repository');
const Sequencer = require('./Sequencer');
const AsyncFsRunnable = require('./AsyncFsRunnable');
const Domain = require('./Domain');

const Me2day = Domain.Me2day;
const People = Domain.People;
const Post = Domain.Post;
const Tag = Domain.Tag;
const Comment = Domain.Comment;

class Parser extends AsyncFsRunnable {
    constructor() {
        super();
        this.sequencer = new Sequencer();
        this.repository = new Repository();
        Me2day.prototype.repository = this.repository;
        this.repository.onLoad.Post = rawText => Post.fromJSON(rawText);
        this.repository.onLoad.Tag = rawText => Tag.fromJSON(rawText);
        this.repository.onLoad.Comment = rawText => Comment.fromJSON(rawText);
        this.repository.onLoad.People = rawText => People.fromJSON(rawText);
    }

    init() {
        return this.run(function *() {
            yield [this.sequencer.load(), this.repository.load('Post', 'People', 'Tag', 'Comment')];
        });
    }

    getAllTargets() {
        return {
            Post: this.repository.data.Post,
            People: this.repository.data.People,
            Tag: this.repository.data.Tag,
            Comment: this.repository.data.Comment
        };
    }

    done() {
        return this.run(function *() {
            yield [this.sequencer.save(), this.repository.save('Post', 'People', 'Tag', 'Comment')];
            return this.getAllTargets();
        });
    }

    execute($, resourcePath, callback = (post) => {
    }) {
        return this.run(function *() {
            let post = yield this.repository.getOne('Post', (target) => {
                return target.resourcePath === resourcePath;
            });
            if (post) {
                return post;
            }
            post = yield this.getPost($, resourcePath);

            let writer = yield this.getPeople($('img.profile_img'));
            this.postAndPeople(post, writer);
            yield this.updateRepository({People: writer});

            let tags = yield this.getTags($);
            this.postAndTags(post, tags);
            yield this.updateRepository({Tag: tags});

            let metooPeopleList = yield this.getMetooPeopleList($);
            this.postAndMetooPeopleList(post, metooPeopleList);
            yield this.updateRepository({People: metooPeopleList});

            let [commentList, writerList] = yield this.getCommentList($);
            this.postAndCommentList(post, commentList);
            yield this.updateRepository({Comment: commentList});
            yield this.updateRepository({People: writerList});

            yield this.updateRepository({Post: post});
            return post;
        }, callback);
    }

    getPost($, resourcePath) {
        return this.run(function *() {
            let post = new Post(yield this.sequencer.get('Post'));
            post.resourcePath = resourcePath;
            post.timestamp = this.toTimestamp($('span.post_permalink').html());
            post.content = this.toContent($('p.post_body').html());
            post.rawContent = $('<p>' + this.toRawContent($('p.post_body').html()) + '</p>').text();
            post.title = post.rawContent.length > 30 ? post.rawContent.substring(0, 30) + '...' : post.rawContent;
            $('a.per_img.photo').each((idx, anchor) => {
                let $anchor = $(anchor), $image = $anchor.find('img');
                post.imageList.push({
                    thumbnail: path.join(resourcePath, '..', $image.attr('src')),
                    original: path.join(resourcePath, '..', $anchor.attr('href'))
                });
            });
            return post;
        });
    };

    getPeople($image) {
        return this.run(function *() {
            let imagePath = $image.attr('src');
            let peopleId = this.extractPeopleIdByImageUri(imagePath);
            let people = yield this.repository.get('People', peopleId);
            if (people) {
                return people;
            }
            people = new People(peopleId);
            people.nickname = $image.attr('alt');
            people.profileImagePath = imagePath;
            yield this.repository.set('People', people.id, people);
            return people;
        });
    };

    getMetooPeopleList($) {
        return this.run(function *() {
            let metooList = [], $metooPeopleImageList = $('a.pi_s.profile_popup.no_link img');
            $metooPeopleImageList.each((idx, image) => {
                let $image = $(image);
                metooList.push(Promise.resolve(this.getPeople($image)));
            });
            return yield metooList;
        });
    };

    getTag(tagText) {
        return this.run(function *() {
            let trimmed = tagText.trim();
            if (!trimmed) {
                return;
            }
            let tag = yield this.repository.getOne('Tag', (target) => {
                return target.content === trimmed;
            });
            if (tag) {
                return tag;
            }
            tag = new Tag(yield this.sequencer.get('Tag'));
            tag.content = trimmed;
            yield this.repository.set('Tag', tag.id, tag);
            return tag;
        });
    };

    getTags($) {
        return this.run(function *() {
            let tagPromiseList = [], tagTextList = $('p.post_tag').text().replace(/[;|\/|\_|\-|\.]/g, '').split(' ');
            for (let tagText of tagTextList) {
                tagPromiseList.push(this.getTag(tagText));
            }
            let tagList = yield tagPromiseList;
            return tagList.filter((tag) => {
                return typeof tag !== 'undefined';
            });
        });
    };

    getComment($comment) {
        return this.run(function *() {
            let comment = new Comment(yield this.sequencer.get('Comment'));
            comment.content = toMarkdown($comment.find('p.para').html());
            comment.rawContent = $comment.find('p.para').text();
            comment.timestamp = this.toTimestamp($comment.find('span.comment_time').text());
            let writer = yield this.getPeople($comment.find('a.comment_profile.profile_popup.no_link img'));
            this.commentAndPeople(comment, writer);
            yield this.repository.set('People', writer.id, writer);
            return [comment, writer];
        });
    };

    getCommentList($) {
        return this.run(function *() {
            let commentPromiseList = [], $commentItemList = $('div.comment_item');
            $commentItemList.each((idx, commentItem) => {
                commentPromiseList.push(this.getComment($(commentItem)));
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

    postAndPeople(post, people) {
        post.writerId = people.id;
        people.postIdList.push(post.id);
    };

    postAndTags(post, tags) {
        post.tagIdList = this.extractIdList(tags, (tag) => {
            tag.postIdList.push(post.id);
        });
    };

    postAndMetooPeopleList(post, metooPeopleList) {
        post.metooPeopleIdList = this.extractIdList(metooPeopleList, (people) => {
            people.metooPostIdList.push(post.id);
        });
    };

    postAndCommentList(post, commentList) {
        post.commentIdList = this.extractIdList(commentList, (comment) => {
            comment.postId = post.id;
        })
    };

    commentAndPeople(comment, people) {
        comment.writerId = people.id;
        people.commentIdList.push(comment.id);
    };

    toTimestamp(timestampText) {
        return new Date('20' + timestampText.replace('.', '-').replace('.', '-').replace(' ', 'T') + ':00+09:00');
    };

    toContent(rawText) {
        return toMarkdown(this.toRawContent(rawText));
    };

    toRawContent(rawText) {
        return rawText.replace(/\<span class\=\"post_permalink\"\>.+\<\/span\>/gi, '');
    }

    extractIdList(objectList, callback = () => {
    }) {
        let result = [];
        for (let obj of objectList) {
            callback(obj);
            result.push(obj['id']);
        }
        return result;
    };

    extractPeopleIdByImageUri(imageUri) {
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
    };

    updateRepository(targetMap) {
        return this.run(function *() {
            let savePromiseList = [];
            for (let key of Object.keys(targetMap)) {
                let value = targetMap[key];
                if (Array.isArray(value)) {
                    for (let valueItem of value) {
                        savePromiseList.push(this.run(function *() {
                            yield this.repository.set(key, valueItem.id, valueItem);
                        }));
                    }
                } else {
                    savePromiseList.push(this.run(function *() {
                        yield this.repository.set(key, value.id, value);
                    }));
                }
            }
            return yield savePromiseList;
        });
    };
}

module.exports = Parser;