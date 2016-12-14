'use strict';
const EOL = require('os').EOL;
const moment = require('moment');

class Me2day {
    constructor() {
    }

    static fromJSON(json) {
        const obj = JSON.parse(json || '{}');
        let result = {};
        for (let key of Object.keys(obj)) {
            let origin = obj[key];
            let target = new this(origin.id);
            for (let originKey of Object.keys(origin)) {
                target[originKey] = origin[originKey];
            }
            result[key] = target;
        }
        return result;
    }

    toDateString(obj) {
        return obj ? moment(obj).format('YYYY-MM-DD HH:mm:ss') : '';
    }

    toString() {
        return `${this.constructor.name} : ${this.id}`;
    }

    toConsole() {
        console && console.log && console.log(this.toString());
    }
}

class People extends Me2day {
    constructor(id) {
        super();
        this.id = id;
        this.nickname;
        this.profileImagePath;
        this.postIdList = [];
        this.commentIdList = [];
        this.metooPostIdList = [];
    }

    getPostList() {
        return this.repository.direct.in('Post', this.postIdList);
    }

    getCommentList() {
        return this.repository.direct.in('Comment', this.commentIdList);
    }

    getMetooPostList() {
        return this.repository.direct.in('Post', this.metooPostIdList);
    }

    toString() {
        return `${this.id} -> post(${this.postIdList.length}), metoo(${this.metooPostIdList.length}), comment(${this.commentIdList.length})`;
    }
}

class Tag extends Me2day {
    constructor(id) {
        super();
        this.id = id;
        this.content;
        this.postIdList = [];
    }

    getPostList() {
        return this.repository.direct.in('Post', this.postIdList);
    }

    toString() {
        return `${this.content}(${this.id}) -> post(${this.postIdList.length})`;
    }
}

class Comment extends Me2day {
    constructor(id) {
        super();
        this.id = id;
        this.postId;
        this.writerId;
        this.timestamp;
        this.content;
        this.rawContent;
    }

    getDatetime() {
        return this.toDateString(this.timestamp);
    }

    getWriter() {
        return this.repository.direct.one('People', this.writerId);
    }

    getPost() {
        return this.repository.direct.one('Post', this.postId);
    }

    toString() {
        return `${this.toDateString(this.timestamp)} ${this.getWriter().nickname} ${this.rawContent}`;
    }
}

class Post extends Me2day {
    constructor(id) {
        super();
        this.id = id;
        this.writerId;
        this.resourcePath;
        this.metooPeopleIdList = [];
        this.timestamp;
        this.title;
        this.content;
        this.rawContent;
        this.rawTag;
        this.tagIdList = [];
        this.commentIdList = [];
        this.imageList = [];
        this.location;
        this.video;
    }

    getDatetime() {
        return this.toDateString(this.timestamp);
    }

    getWriter() {
        return this.repository.direct.one('People', this.writerId);
    }

    getMetooPeopleList() {
        return this.repository.direct.in('People', this.metooPeopleIdList);
    }

    getTagList() {
        return this.repository.direct.in('Tag', this.tagIdList);
    }

    getCommentList() {
        return this.repository.direct.in('Comment', this.commentIdList);
    }

    toString() {
        let result = [],
            getTags = () => {
                let tagText = [];
                for (let tag of this.getTagList()) {
                    tagText.push(tag.content);
                }
                return tagText.join(' ');
            }, getMetoo = () => {
                let metooIds = [];
                for (let people of this.getMetooPeopleList()) {
                    metooIds.push(people.id);
                }
                return metooIds.join(',');
            }, getComment = () => {
                let commentText = [];
                for (let comment of this.getCommentList()) {
                    commentText.push(comment.toString());
                }
                return commentText.join(EOL);
            };
        result.push(`Post ID: ${this.id}`);
        result.push(`Content: ${this.rawContent}`);
        result.push(`Time: ${this.toDateString(this.timestamp)}`);
        result.push(`Tags: ${getTags()}`);
        result.push(`Metoo: ${getMetoo()}`);
        result.push(`Comment: `);
        result.push(getComment());
        result.push('');
        return result.join(EOL);
    }
}

const util = (() => {
    const
        extractIdList = (objectList, callback = () => {
        }) => {
            let result = [];
            for (let obj of objectList) {
                callback(obj);
                result.push(obj['id']);
            }
            return result;
        },
        postAndPeople = (post, people) => {
            post.writerId = people.id;
            people.postIdList.push(post.id);
        },
        postAndTags = (post, tags) => {
            post.tagIdList = util.extractIdList(tags, (tag) => {
                tag.postIdList.push(post.id);
            });
        },
        postAndMetooPeopleList = (post, metooPeopleList) => {
            post.metooPeopleIdList = extractIdList(metooPeopleList, (people) => {
                people.metooPostIdList.push(post.id);
            });
        },
        postAndCommentList = (post, commentList) => {
            post.commentIdList = extractIdList(commentList, (comment) => {
                comment.postId = post.id;
            })
        },

        commentAndPeople = (comment, people) => {
            comment.writerId = people.id;
            people.commentIdList.push(comment.id);
        },
        extractPeopleIdByImageUri = (imageUri) => {
            let regex = new RegExp("/img/images/user/(.+)/profile.png"), peopleId;
            if (imageUri.includes('/img/images/user/')) {
                let parsed = regex.exec(imageUri);
                if (parsed.length > 1) {
                    peopleId = parsed[1];
                }
            } else {
                let parsed = imageUri.split('/')[3].split('_'),
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
        toRawContent = (rawText) => {
            return rawText.replace(/\<span class\=\"post_permalink\"\>.+\<\/span\>/gi, '');
        },
        toTimestamp = (timestampText) => {
            return new Date('20' + timestampText.replace('.', '-').replace('.', '-').replace(' ', 'T') + ':00+09:00');
        };
    return {
        graph: {
            postAndPeople: postAndPeople,
            postAndTags: postAndTags,
            postAndMetooPeopleList: postAndMetooPeopleList,
            postAndCommentList: postAndCommentList,
            commentAndPeople: commentAndPeople
        },
        extractPeopleIdByImageUri: extractPeopleIdByImageUri,
        toRawContent: toRawContent,
        toTimestamp: toTimestamp,
        extractIdList: extractIdList
    };
})();


module.exports = {
    Me2day: Me2day,
    People: People,
    Post: Post,
    Tag: Tag,
    Comment: Comment,
    util: util
};