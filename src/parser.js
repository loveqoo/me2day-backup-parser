var cheerio = require('cheerio');
var toMarkdown = require('to-markdown');
var fs = require('fs');
var path = require('path');
var repository = require('./repository');

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

var createContext = function () {
    return (function () {
        var o = {},
            get = function (key, defaultValue) {
                var v = o[key];
                if (typeof v !== 'undefined') {
                    return v;
                }
                if (defaultValue) {
                    return defaultValue;
                }
                return v;
            },
            set = function (key, value) {
                o[key] = value;
            };
        return {get: get, set: set};
    })();
};

var error = function (msg) {
    throw new Error(msg || 'invalid parameter');
};

var Me2day = {
    createContext: createContext,
    repository: undefined,
    setUp: function (context) {
        !(context && context.get('config')) && error();
        if (!context.get('repository')) {
            context.set('repository', repository(context.get('config')));
            Me2day.repository = context.get('repository');
        }
        var path = context.get('config').path;
        for (var domain in path) {
            path.hasOwnProperty(domain) && path[domain]
            && fs.existsSync(path[domain]) && fs.unlinkSync(path[domain]);
        }
    },
    graph: {
        postAndPeople: function (post, people) {
            post.authorId = people.id;
            people.postIdList.push(post.id);
            Me2day.repository.set(Me2day.domain.People, people);
        },
        postAndTagList: function (post, tagList) {
            post.tagIdList = Me2day.util.map(tagList, function (tag) {
                return tag.id;
            });
            tagList.forEach(function (tag) {
                tag.postIdList.push(post.id);
                Me2day.repository.set(Me2day.domain.Tag, tag);
            });
        },
        postAndMetooPeopleList: function (post, metooPeopleList) {
            post.metooPeopleIdList = Me2day.util.map(metooPeopleList, function (people) {
                return people.id;
            });
            metooPeopleList.forEach(function (metooPeople) {
                metooPeople.metooPostIdList.push(metooPeople.id);
                Me2day.repository.set(Me2day.domain.People, metooPeople);
            });
        },
        postAndCommentList: function (post, commentList) {
            post.commentIdList = Me2day.util.map(commentList, function (comment) {
                return comment.id;
            });
            commentList.forEach(function (comment) {
                comment.postId = post.id;
                Me2day.repository.set(Me2day.domain.Comment, comment);
            });
        },
        commentAndPeople: function (comment, people) {
            comment.authorId = people.id;
            people.commentIdList.push(comment.id);
            Me2day.repository.set(Me2day.domain.Comment, comment);
            Me2day.repository.set(Me2day.domain.People, people);
        }
    },
    parse: {
        directory: function (context, callback) {
            !(context && context.get('config') && context.get('directoryPath')) && error();
            Me2day.setUp(context);

            var directoryPath = context.get('directoryPath');
            var files = fs.readdirSync(directoryPath, 'utf-8');
            var fileCount = files.length;
            var count = 1;

            var showProgress = function () {
                context.get('debug', false) && console.log('Progress: ' + count + '/' + fileCount);
                count += 1;
            };

            files.forEach(function (fileName) {
                showProgress();
                if (path.extname(fileName) !== '.html') {
                    return;
                }
                context.set('resourcePath', path.join(directoryPath, fileName));
                return Me2day.parse.file(context, callback);
            });
        },
        file: function (context, callback) {
            !(context && context.get('resourcePath')) && error();
            Me2day.setUp(context);

            var $ = Me2day.parse.getCheerio(context.get('resourcePath'));
            context.set('$', $);

            var $container = $('div#container');
            context.set('$container', $container);

            var post = Me2day.parse.getPost(context);
            context.get('debug', false) && console.log('Post(' + post.id + ') is parsed.');
            callback && (typeof callback === 'function') && callback(post, context);
        },
        getCheerio: function (resourcePath) {
            !(resourcePath) && error();
            if (!fs.existsSync(resourcePath)) {
                throw new Error('invalid resource path : ' + resourcePath);
            }
            var resource = fs.readFileSync(resourcePath, 'utf-8');
            return cheerio.load(resource, {normalizeWhitespace: true});
        },
        getPost: function (context) {
            !(context && context.get('$') && context.get('repository') && context.get('$container')) && error();
            var $ = context.get('$');
            var repository = context.get('repository');
            var $container = context.get('$container');

            var $postBody = $container.find('p.post_body');
            var $timestamp = $postBody.find('span.post_permalink');

            var post = new Me2day.domain.Post();
            post.text = toMarkdown(Me2day.util.extractContent($postBody.html()));
            post.timestamp = Me2day.util.parseDate($timestamp.html());

            var title = $('<p>' + Me2day.util.extractContent($postBody.html()) + '</p>').text().trim();
            post.title = title > 30 ? title.substring(0, 30) + '...' : title;

            var author = Me2day.parse.getAuthor(context);
            Me2day.graph.postAndPeople(post, author);

            var tagList = Me2day.parse.getTagList(context);
            Me2day.graph.postAndTagList(post, tagList);

            var metooPeopleList = Me2day.parse.getMetooPeopleList(context);
            Me2day.graph.postAndMetooPeopleList(post, metooPeopleList);

            var commentList = Me2day.parse.getCommentList(context);
            Me2day.graph.postAndCommentList(post, commentList);

            post.imageList = Me2day.parse.getImageList(context);

            repository.set(Me2day.domain.Post, post);
            return post;
        },
        getAuthor: function (context) {
            !(context && context.get('$') && context.get('repository') && context.get('$container')) && error();
            var $container = context.get('$container');
            var $image = $container.find('img.profile_img'),
                peopleId = Me2day.util.extractPeopleIdByImageUri($image.attr('src'));
            return Me2day.util.getPeople(peopleId, $image.attr('src'), $image.attr('alt'), context);
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
                var tagList = Me2day.repository.list(Me2day.domain.Tag, function (tag) {
                    return tag.text === tagText;
                });
                if (tagList.length > 0) {
                    tags.push(tagList[0]);
                }
                var tag = new Me2day.domain.Tag(null, tagText);
                Me2day.repository.set(Me2day.domain.Tag, tag);
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
                var peopleId = Me2day.util.extractPeopleIdByImageUri($image.prop('src'));
                var people = Me2day.util.getPeople(peopleId, $image.attr('src'), $image.attr('alt'), context);
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
                    peopleId = Me2day.util.extractPeopleIdByImageUri($image.attr('src'));
                var people = Me2day.util.getPeople(peopleId, $image.attr('src'), $image.attr('alt'), context);

                var comment = new Me2day.domain.Comment();
                comment.timestamp = Me2day.util.parseDate($commentTimestamp.text());
                comment.text = commentText;
                Me2day.repository.set(Me2day.domain.Comment, comment);
                Me2day.graph.commentAndPeople(comment, people);
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
    },
    util: {
        map : function (list, callback) {
            var result = [];
            list.forEach(function (item) {
                var data = callback(item);
                data && result.push(data);
            });
            return result;
        },
        getPeople: function (peopleId, imageSrc, nickname, context) {
            var resourcePath = context.get('resourcePath');
            var people = Me2day.repository.get(Me2day.domain.People, peopleId);
            if (people) {
                return people;
            }
            people = new Me2day.domain.People(peopleId);
            people.nickname = nickname;
            people.profilePath = path.join(resourcePath, '..', imageSrc);
            Me2day.repository.set(Me2day.domain.People, people);
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
    domain: {
        People: function (id) {
            this.id = id;
            this.nickname = undefined;
            this.profilePath = undefined;
            this.postIdList = [];
            this.getPostList = function () {
                return this.postIdList.map(function (postId) {
                    return Me2day.repository.get(Me2day.domain.Post, postId);
                });
            };
            this.commentIdList = [];
            this.getCommentList = function () {
                return this.commentIdList.map(function (commentId) {
                    return Me2day.repository.get(Me2day.domain.Comment, commentId);
                });
            };
            this.metooPostIdList = [];
            this.getMetooPostList = function () {
                return this.metooPostIdList.map(function (postId) {
                    return Me2day.repository.get(Me2day.domain.Post, postId);
                });
            };
        },
        Post: function (id) {
            this.id = id || sequencer.get(this);
            this.title = undefined;
            this.text = undefined;
            this.timestamp = undefined;
            this.authorId = undefined;
            this.getAuthor = function () {
                return Me2day.repository.get(Me2day.domain.People, this.authorId);
            };
            this.imageList = [];
            this.metooPeopleIdList = [];
            this.getMetooPeopleList = function () {
                return this.metooPeopleIdList.map(function (peopleId) {
                    return Me2day.repository.get(Me2day.domain.People, peopleId);
                });
            };
            this.tagIdList = [];
            this.getTagList = function () {
                return this.tagIdList.map(function (tagId) {
                    return Me2day.repository.get(Me2day.domain.Tag, tagId);
                });
            };
            this.commentIdList = [];
            this.getCommentList = function () {
                return this.commentIdList.map(function (commentId) {
                    return Me2day.repository.get(Me2day.domain.Comment, commentId);
                });
            };
            this.hasTag = function (tag) {
                var found = false;
                this.getTagList().every(function (tagObj) {
                    if (tagObj.id === tag) {
                        found = true;
                        return false;
                    }
                });
                return found;
            };
            this.toString = function () {
                var result = [],
                    extractNickname = function (peopleList) {
                        return peopleList.map(function (people) {
                            return people.nickname;
                        });
                    },
                    extractTag = function (tagList) {
                        return tagList.map(function (tag) {
                            return tag.id;
                        });
                    },
                    extractImage = function (imageList) {
                        return imageList.map(function (image) {
                            return image.original;
                        });
                    };
                result.push('id: ' + this.id);
                result.push('title: ' + this.title);
                result.push('post: ' + this.text);
                result.push('timestamp: ' + this.timestamp);
                result.push('author: ' + this.getAuthor().nickname + '(' + this.getAuthor().profilePath + ')');
                result.push('metoo(' + this.getMetooPeopleList().length + '):' + extractNickname(this.getMetooPeopleList()).join(','));
                result.push('tags: ' + extractTag(this.getTagList()).join(','));
                result.push('images: ' + extractImage(this.imageList).join(','));
                result.push('comment: ');
                this.getCommentList().forEach(function (comment) {
                    result.push(comment.getAuthor().nickname + ':' + comment.text + '<' + comment.timestamp + '>');
                });
                return result.join('\r\n');
            }
        },
        Comment: function (id) {
            this.id = id || sequencer.get(this);
            this.text = undefined;
            this.timestamp = undefined;
            this.authorId = undefined;
            this.getAuthor = function () {
                return Me2day.repository.get(Me2day.domain.People, this.authorId);
            };
            this.postId = undefined;
            this.getPost = function () {
                return Me2day.repository.get(Me2day.domain.Post, this.postId);
            }
        },
        Tag: function (id, text) {
            this.id = id || sequencer.get(this);
            this.text = text;
            this.postIdList = [];
            this.getPostList = function () {
                return this.postIdList.map(function (postId) {
                    return Me2day.repository.get(Me2day.domain.Post, postId);
                });
            };
        }
    }
};

Me2day.domain.People.fromJSON = function (data) {
    if (!data) {
        return;
    }
    var people = new Me2day.domain.People(data.id);
    people.nickname = data.nickname;
    people.profilePath = data.profilePath;
    people.postIdList = data.postIdList || [];
    people.commentIdList = data.commentIdList || [];
    people.metooPostIdList = data.metooPostIdList || [];
    return people;
};

Me2day.domain.Post.fromJSON = function (data) {
    if (!data) {
        return;
    }
    var post = new Me2day.domain.Post(data.id);
    post.title = data.title;
    post.text = data.text;
    post.timestamp = new Date(data.timestamp);
    post.authorId = data.authorId;
    post.imageList = data.imageList || [];
    post.metooPeopleIdList = data.metooPeopleIdList || [];
    post.tagIdList = data.tagIdList || [];
    post.commentIdList = data.commentIdList || [];
    return post;
};

Me2day.domain.Comment.fromJSON = function (data) {
    if (!data) {
        return;
    }
    var comment = new Me2day.domain.Comment(data.id);
    comment.text = data.text;
    comment.timestamp = new Date(data.timestamp);
    comment.authorId = data.authorId;
    comment.postId = data.postId;
    return comment;
};

Me2day.domain.Tag.fromJSON = function (data) {
    if (!data) {
        return;
    }
    var tag = new Me2day.domain.Tag(data.id);
    tag.text = data.text;
    tag.postIdList = data.postIdList || [];
    return tag;
};

module.exports = Me2day;