const _ = require('lodash');

const me2day = {
    domain: {
        People(id) {
            this.id = id;
            this.nickname = undefined;
            this.profilePath = undefined;
            this.postIdList = [];
            // this.getPostList = function () {
            //     return this.postIdList.map(function (postId) {
            //         return Me2day.repository.get(Me2day.domain.Post, postId);
            //     });
            // };
            this.commentIdList = [];
            // this.getCommentList = function () {
            //     return this.commentIdList.map(function (commentId) {
            //         return Me2day.repository.get(Me2day.domain.Comment, commentId);
            //     });
            // };
            this.metooPostIdList = [];
            // this.getMetooPostList = function () {
            //     return this.metooPostIdList.map(function (postId) {
            //         return Me2day.repository.get(Me2day.domain.Post, postId);
            //     });
            // };
        },
        Post(id) {
            this.id = id || sequencer.get(this);
            this.sourcePath = undefined;
            this.title = undefined;
            this.text = undefined;
            this.timestamp = undefined;
            this.authorId = undefined;
            // this.getAuthor = function () {
            //     return Me2day.repository.get(Me2day.domain.People, this.authorId);
            // };
            this.imageList = [];
            this.metooPeopleIdList = [];
            // this.getMetooPeopleList = function () {
            //     return this.metooPeopleIdList.map(function (peopleId) {
            //         return Me2day.repository.get(Me2day.domain.People, peopleId);
            //     });
            // };
            this.tagIdList = [];
            // this.getTagList = function () {
            //     return this.tagIdList.map(function (tagId) {
            //         return Me2day.repository.get(Me2day.domain.Tag, tagId);
            //     });
            // };
            this.commentIdList = [];
            // this.getCommentList = function () {
            //     return this.commentIdList.map(function (commentId) {
            //         return Me2day.repository.get(Me2day.domain.Comment, commentId);
            //     });
            // };
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
            // this.getAuthor = function () {
            //     return Me2day.repository.get(Me2day.domain.People, this.authorId);
            // };
            this.postId = undefined;
            // this.getPost = function () {
            //     return Me2day.repository.get(Me2day.domain.Post, this.postId);
            // }
        },
        Tag: function (id, text) {
            this.id = id || sequencer.get(this);
            this.text = text;
            this.postIdList = [];
            // this.getPostList = function () {
            //     return this.postIdList.map(function (postId) {
            //         return Me2day.repository.get(Me2day.domain.Post, postId);
            //     });
            // };
        }
    },
    graph: {
        postAndPeople(post, people) {
            post.authorId = people.id;
            people.postIdList.push(post.id);
            //Me2day.repository.set(Me2day.domain.People, people);
        },
        postAndTagList(post, tagList) {
            post.tagIdList = Me2day.util.addUniq(post.tagIdList, Me2day.util.map(tagList, function (tag) {
                return tag.id;
            }));
            tagList.forEach(function (tag) {
                tag.postIdList.push(post.id);
                //Me2day.repository.set(Me2day.domain.Tag, tag);
            });
        },
        postAndMetooPeopleList(post, metooPeopleList) {
            post.metooPeopleIdList = Me2day.util.map(metooPeopleList, function (people) {
                return people.id;
            });
            metooPeopleList.forEach(function (metooPeople) {
                metooPeople.metooPostIdList.push(post.id);
                //Me2day.repository.set(Me2day.domain.People, metooPeople);
            });
        },
        postAndCommentList(post, commentList) {
            post.commentIdList = Me2day.util.map(commentList, function (comment) {
                return comment.id;
            });
            commentList.forEach(function (comment) {
                comment.postId = post.id;
                //Me2day.repository.set(Me2day.domain.Comment, comment);
            });
        },
        commentAndPeople(comment, people) {
            comment.authorId = people.id;
            people.commentIdList.push(comment.id);
            //Me2day.repository.set(Me2day.domain.Comment, comment);
            //Me2day.repository.set(Me2day.domain.People, people);
        }
    },
    util: {
        addUniq (target, values) {
            !(Array.isArray(target) && Array.isArray(values)) && error();
            return target.concat(values).filter(function (value, index, self) {
                return self.indexOf(value) === index;
            });
        },
        map (list, callback) {
            !(Array.isArray(list) && typeof callback === 'function') && error();
            var result = [];
            list.forEach(function (item) {
                var data = callback(item);
                data && result.push(data);
            });
            return result;
        },
        getPeople (peopleId, imageSrc, nickname, context) {
            var resourcePath = context.get('resourcePath');
            var people = Me2day.repository.get(Me2day.domain.People, peopleId);
            if (people) {
                return people;
            }
            people = new Me2day.domain.People(peopleId);
            people.nickname = nickname;
            people.profilePath = path.join(resourcePath, '..', imageSrc);
            //Me2day.repository.set(Me2day.domain.People, people);
            return people;
        },
        parseDate (dateString) {
            return new Date('20' + dateString.replace('.', '-').replace('.', '-').replace(' ', 'T') + ':00+09:00');
        },
        extractContent (contentHtml) {
            return contentHtml.replace(/\<span class\=\"post_permalink\"\>.+\<\/span\>/gi, '');
        },
        extractPeopleIdByImageUri (imageUri) {
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
    }
};

me2day.domain.People.fromJSON = (data) => {
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

me2day.domain.Post.fromJSON = (data) => {
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

me2day.domain.Comment.fromJSON = (data) => {
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

me2day.domain.Tag.fromJSON = (data) => {
    if (!data) {
        return;
    }
    var tag = new Me2day.domain.Tag(data.id);
    tag.text = data.text;
    tag.postIdList = data.postIdList || [];
    return tag;
};

module.exports = me2day;