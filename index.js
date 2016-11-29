var cheerio = require('cheerio');
var toMarkdown = require('to-markdown');
var fs = require('fs');
var path = require('path');

var sequencer = (function () {
    var o = {};
    return {
        get: function (obj) {
            var type = obj.constructor.name;
            if (!type) {
                throw new Error('type is invalid.');
            }
            if (typeof o[type] === 'undefined') {
                o[type] = 1;
                return 1;
            } else {
                o[type] += 1;
                return o[type];
            }
        }
    };
})();

var repository = (function () {
    var o = {},
        get = function (type, id) {
            return o[type.name] ? o[type.name][id] : undefined;
        },
        set = function (type, obj) {
            if (!o[type.name]) {
                o[type.name] = {};
            }
            o[type.name][obj.id] = obj;
        };
    return {get: get, set: set};
})();

var createContext = function () {
    return (function () {
        var o = {},
            get = function (key) {
                return o[key];
            },
            set = function (key, value) {
                o[key] = value;
            };
        return {get: get, set: set};
    })();
};

var Me2day = {
    parse: {
        directory: function (context, callback) {
            var directoryPath = context.get('directoryPath');
            var files = fs.readdirSync(directoryPath, 'utf-8');
            files.forEach(function (fileName) {
                if (path.extname(fileName) !== '.html') {
                    return;
                }
                context.set('resourcePath', path.join(directoryPath, fileName));
                return Me2day.parse.file(context, callback);
            });
        },
        file: function (context, callback) {
            var $ = Me2day.parse.getCheerio(context.get('resourcePath'));
            context.set('$', $);
            var post = Me2day.parse.getPost(context);
            callback(post, context);
        },
        getCheerio: function (resourcePath) {
            if (!fs.existsSync(resourcePath)) {
                throw new Error('invalid resource path : ' + resourcePath);
            }
            var resource = fs.readFileSync(resourcePath, 'utf-8');
            return cheerio.load(resource, {normalizeWhitespace: true});
        },
        getPost: function (context) {
            var $ = context.get('$');
            var $container = $('div#container');
            context.set('$container', $container);

            var $postBody = $container.find('p.post_body');
            var $timestamp = $postBody.find('span.post_permalink');

            var post = new Me2day.domain.Post();
            post.text = toMarkdown(Me2day.util.extractContent($postBody.html()));
            post.timestamp = Me2day.util.parseDate($timestamp.html());

            var title = $('<p>' + Me2day.util.extractContent($postBody.html()) + '</p>').text().trim();
            post.title = title > 30 ? title.substring(0, 30) + '...' : title;

            var author = Me2day.parse.getAuthor(context);
            post.author = author;
            author.postList.push(post);

            var tagList = Me2day.parse.getTagList(context);
            post.tagList = tagList;
            tagList.forEach(function (tag) {
                tag.postList.push(post);
            });

            var metooPeopleList = Me2day.parse.getMetooPeopleList(context);
            post.metooPeopleList = metooPeopleList;
            metooPeopleList.forEach(function (people) {
                people.metooPostList.push(post);
            });

            var commentList = Me2day.parse.getCommentList(context);
            commentList.forEach(function (comment) {
                comment.post = post;
            });
            post.commentList = commentList;

            post.imageList = Me2day.parse.getImageList(context);

            repository.set(Me2day.domain.Post, post);
            return post;
        },
        getAuthor: function (context) {
            var $container = context.get('$container');
            var $image = $container.find('img.profile_img'),
                peopleId = Me2day.util.extractPeopleIdByImageUri($image.attr('src'));
            return Me2day.util.getPeople(peopleId, $image.attr('src'), $image.attr('alt'), context.get('resourcePath'));
        },
        getTagList: function (context) {
            var $container = context.get('$container');
            var $tagBody = $container.find('p.post_tag');
            var tagTextList = $tagBody.text().replace(/[;|\/|\_|\-|\.]/g, '').split(' ');
            var tags = [];
            tagTextList.forEach(function (tagTextRaw) {
                var tagText = tagTextRaw.trim();
                if (!tagText) {
                    return;
                }
                var tag = repository.get(Me2day.domain.Tag, tagText);
                if (!tag) {
                    tag = new Me2day.domain.Tag(tagText);
                    repository.set(Me2day.domain.Tag, tag);
                }
                tags.push(tag);
            });
            return tags;
        },
        getMetooPeopleList: function (context) {
            var $ = context.get('$');
            var $container = context.get('$container');
            var $metooContainer = $container.find('div.me2box.type_7');
            var $metooPeople = $metooContainer.find('a.pi_s.profile_popup.no_link img');
            var metooPeopleList = [];
            $metooPeople.each(function () {
                var $image = $(this);
                var peopleId = Me2day.util.extractPeopleIdByImageUri($image.prop('src'));
                var people = Me2day.util.getPeople(peopleId, $image.attr('src'), $image.attr('alt'), context.get('resourcePath'));
                metooPeopleList.push(people);
            });
            return metooPeopleList;
        },
        getCommentList: function (context) {
            var $ = context.get('$');
            var $container = context.get('$container');
            var $commentContainer = $container.find('div.comments_list_wrap');
            var commentList = [];
            $commentContainer.find('div.comment_item').each(function () {
                var $comment = $(this),
                    $image = $comment.find('a.comment_profile.profile_popup.no_link img'),
                    $commentTimestamp = $comment.find('span.comment_time'),
                    commentText = toMarkdown($comment.find('p.para').html()),
                    peopleId = Me2day.util.extractPeopleIdByImageUri($image.attr('src'));
                var people = Me2day.util.getPeople(peopleId, $image.attr('src'), $image.attr('alt'), context.get('resourcePath'));
                var comment = new Me2day.domain.Comment();
                comment.timestamp = Me2day.util.parseDate($commentTimestamp.text());
                comment.text = commentText;
                comment.people = people;
                people.commentList.push(comment);
                commentList.push(comment);
            });
            return commentList;
        },
        getImageList: function (context) {
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
    },
    util: {
        getPeople: function (peopleId, imageSrc, nickname, resourcePath) {
            var people = repository.get(Me2day.domain.People, peopleId);
            if (people) {
                return people;
            }
            people = new Me2day.domain.People(peopleId);
            people.nickname = nickname;
            people.profilePath = path.join(resourcePath, '..', imageSrc);
            repository.set(Me2day.domain.People, people);
            return people;
        },
        parseDate: function (dateString) {
            return new Date('20' + dateString.replace('.', '-').replace('.', '-').replace(' ', 'T') + ':00+09:00');
        },
        extractContent: function (contentHtml) {
            return contentHtml.replace(/\<span class\=\"post_permalink\"\>.+\<\/span\>/gi, '');
        },
        extractPeopleIdByImageUri: function (imageUri) {
            var regex = new RegExp("/img/images/user/(.+)/profile.png"), peopleId;
            if (imageUri.includes('/img/images/user/')) {
                var parsed = regex.exec(imageUri);
                if (parsed.length > 1) {
                    peopleId = parsed[1];
                }
            } else {
                var parsed = imageUri.split('/')[3].split('_'),
                    validLength = parsed.length - 2,
                    temp = [];
                parsed.forEach(function (str, index) {
                    if (index < validLength) {
                        temp.push(str);
                    }
                });
                peopleId = temp.join('_');
            }
            return peopleId;
        }
    },
    repository: repository,
    createContext: createContext,
    domain: {
        People: function (id) {
            this.id = id;
            this.nickname;
            this.profilePath;
            this.postList = [];
            this.commentList = [];
            this.metooPostList = [];
        },
        Post: function (id) {
            this.id = id || sequencer.get(this);
            this.title;
            this.text;
            this.timestamp;
            this.author;
            this.imageList = [];
            this.metooPeopleList = [];
            this.tagList = [];
            this.commentList = [];
            this.hasTag = function (tag) {
                var found = false;
                this.tagList.every(function (tagObj) {
                    if (tagObj.id === tag) {
                        found = true;
                        return false;
                    }
                });
                return found;
            };
            this.toString = function () {
                var result = [], extractNickname = function (peopleList) {
                    return peopleList.map(function (people) {
                        return people.nickname;
                    });
                }, extractTag = function (tagList) {
                    return tagList.map(function (tag) {
                        return tag.id;
                    });
                }, extractImage = function (imageList) {
                    return imageList.map(function (image) {
                        return image.original;
                    });
                };
                result.push('id: ' + this.id);
                result.push('title: ' + this.title);
                result.push('post: ' + this.text);
                result.push('timestamp: ' + this.timestamp);
                result.push('author: ' + this.author.nickname + '(' + this.author.profilePath + ')');
                result.push('metoo(' + this.metooPeopleList.length + '):' + extractNickname(this.metooPeopleList).join(','));
                result.push('tags: ' + extractTag(this.tagList).join(','));
                result.push('images: ' + extractImage(this.imageList).join(','));
                result.push('comment: ');
                this.commentList.forEach(function (comment) {
                    result.push(comment.people.nickname + ':' + comment.text + '<' + comment.timestamp + '>');
                });
                return result.join('\r\n');
            }
        },
        Comment: function (id) {
            this.id = id || sequencer.get(this);
            this.text;
            this.timestamp;
            this.people;
            this.post;
        },
        Tag: function (id) {
            this.id = id;
            this.postList = [];
        }
    }
};

exports.Me2day = Me2day;