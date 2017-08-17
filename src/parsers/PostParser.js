const path = require('path');
const Parsable = require('../defines/Parsable');
const util = require('../defines/Domain').util;

class PostParser extends Parsable {

    constructor(parameter) {
        super(parameter);
    }

    isMine(resourcePath) {
        return /.\/post$/.test(resourcePath) || path.basename(resourcePath) === 'test';
    }

    parse(resourcePath, $) {
        return this.run(function *() {
            let post = yield this.repository.getOne('Post', (target) => {
                return target.resourcePath === resourcePath;
            });
            if (post) {
                return post;
            }
            post = yield this.getPost($, resourcePath);

            let writer = yield this.getPeople($('img.profile_img'), resourcePath);
            util.graph.postAndPeople(post, writer);
            yield this.updateRepository({People: writer});

            let tags = yield this.getTags($);
            util.graph.postAndTags(post, tags);
            yield this.updateRepository({Tag: tags});

            let metooPeopleList = yield this.getMetooPeopleList($, resourcePath);
            util.graph.postAndMetooPeopleList(post, metooPeopleList);
            yield this.updateRepository({People: metooPeopleList});

            let [commentList, writerList] = yield this.getCommentList($, resourcePath);
            commentList.forEach(comment => {
              comment.content = util.replaceCustomAnchor(comment.content, this.repository.getDao('People').findByNickname);
            });

            util.graph.postAndCommentList(post, commentList);
            yield this.updateRepository({Comment: commentList});
            yield this.updateRepository({People: writerList});
            yield this.updateRepository({Post: post});
            return post.title;
        });
    }

    getPost($, resourcePath) {
        return this.run(function *() {
            let post = yield this.factory.newPost();
            post.resourcePath = resourcePath;
            post.timestamp = util.toTimestamp($('span.post_permalink').html());
            post.content = this.toMarkdown(util.toRawContent($('p.post_body').html()));
            post.rawContent = $('<p>' + util.toRawContent($('p.post_body').html()) + '</p>').text();
            post.rawTag = $('p.post_tag').text();
            post.title = post.rawContent.length > 30 ? post.rawContent.substring(0, 30) + '...' : post.rawContent;
            post.title = post.title.trim();

            $('a.per_img.photo').each((idx, anchor) => {
                let $anchor = $(anchor), $image = $anchor.find('img');
                post.imageList.push({
                    thumbnail: path.join(resourcePath, '..', $image.attr('src')),
                    original: path.join(resourcePath, '..', $anchor.attr('href'))
                });
            });
            let $map = $('div.map_container');
            if ($map.length === 1) {
                post.location = {};
                post.location.name = $map.find('span.map_location_alt').text();
                post.location.link = $map.find('a').attr('href');
                post.location.image = path.join(resourcePath, '..', $map.find('img').attr('src'));
            }
            let $embed = $('div.embed_me2photo');
            if ($embed.length === 1) {
                post.video = {};
                post.video.src = path.join(resourcePath, '..', '..', '..', $embed.find('a').attr('href'));
                post.video.thumbnail = path.join(resourcePath, '..', '..', '..', $embed.find('img').attr('src'));
            }
            return post;
        });
    };

    getPeople($image, resourcePath, additionalNickname) {
        return this.run(function *() {
            let imagePath = $image.attr('src');
            let peopleId = util.extractPeopleIdByImageUri(imagePath);
            let people = yield this.repository.get('People', peopleId);
            if (people) {
                return people;
            }
            people = this.factory.newPeople(peopleId);
            //people.nickname = $image.attr('alt');
            people.setNickname($image.attr('alt'));
            additionalNickname && people.setNickname(additionalNickname);
            people.profileImagePath = path.join(resourcePath, '..', imagePath);
            yield this.repository.set('People', people.id, people);
            return people;
        });
    };

    getMetooPeopleList($, resourcePath) {
        return this.run(function *() {
            let metooList = [], $metooPeopleImageList = $('a.pi_s.profile_popup.no_link img');
            $metooPeopleImageList.each((idx, image) => {
                let $image = $(image);
                metooList.push(Promise.resolve(this.getPeople($image, resourcePath)));
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
            tag = yield this.factory.newTag();
            tag.content = trimmed;
            yield this.repository.set('Tag', tag.id, tag);
            return tag;
        });
    };

    getTags($) {
        return this.run(function *() {
            let tagPromiseList = [], tagTextList = $('p.post_tag').text().replace(/[;|,|\/|\_|\-|\.]/g, '').split(' ');
            for (let tagText of tagTextList) {
                tagPromiseList.push(this.getTag(tagText));
            }
            let tagList = yield tagPromiseList;
            return tagList.filter((tag) => {
                return typeof tag !== 'undefined';
            });
        });
    };

    getComment($, $comment, resourcePath) {
        return this.run(function *() {
            let $content = $comment.find('p.para');
            let comment = yield this.factory.newComment();
            let nickname = $comment.find('span.comment_author a').text();
            let writer = yield this.getPeople($comment.find('a.comment_profile.profile_popup.no_link img'), resourcePath, nickname);
            util.graph.commentAndPeople(comment, writer);
            yield this.repository.set('People', writer.id, writer);

            comment.content = this.toMarkdown($content.html());
            comment.rawContent = $('<p>' + $content.html() + '</p>').text();
            comment.timestamp = util.toTimestamp($comment.find('span.comment_time').text());
            return [comment, writer];
        });
    };

    getCommentList($, resourcePath) {
        return this.run(function *() {
            let commentPromiseList = [], $commentItemList = $('div.comment_item');
            $commentItemList.each((idx, commentItem) => {
                commentPromiseList.push(this.getComment($, $(commentItem), resourcePath));
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
}
module.exports = PostParser;