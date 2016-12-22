'use strict';
const EOL = require('os').EOL;
const path = require('path');
const moment = require('moment');
const AsyncFsRunnable = require('./defines/AsyncFsRunnable');

class Repository extends AsyncFsRunnable {

    constructor() {
        super();
        this.pwd = process.env.PWD;
        this.defaultFolderName = '.repo';
        this.directoryPath = path.join(this.pwd, this.defaultFolderName);
        this.onLoad = {};
        this.direct = {};
        this.direct.in = (key, idList) => {
            !(key && idList) && this.throwError();
            if (!this.data[key]) {
                return [];
            }
            let result = [];
            for (let id of idList) {
                result.push(this.data[key][id]);
            }
            return result;
        };
        this.direct.one = (key, id) => {
            !(key && id) && this.throwError();
            if (!this.data[key]) {
                return;
            }
            return this.data[key][id];
        }
    }

    getMeta(){
        const result = {};
        const envDao = this.getDao('Env');
        const people = envDao.anyone('People');
        result.root = path.join(people.profileImagePath, '../../../../..');
        return result;
    }

    getDao(key) {
        let originData = this.data,
            getIdList = (key) => {
                return Object.keys(this.data[key]);
            },
            originFilter = (key, f) => {
                let result = [];
                for (let id of getIdList(key)) {
                    f && f(this.data[key][id]) && result.push(this.data[key][id]);
                }
                return result;
            },
            originList = (key, ...ids) => {
                let result = [];
                for (let id of ids) {
                    result.push(this.data[key][id]);
                }
                return result;
            },
            originEach = (key, f) => {
                for (let id of getIdList(key)) {
                    f && f(this.data[key][id]);
                }
            },
            dao = {
                Env: {
                    anyone(key){
                        let idList = getIdList(key);
                        return originData[key][idList[0]];
                    }
                },
                People: {
                    each(f) {
                        originEach('People', f);
                    },
                    findById(id){
                        return originData['People'][id];
                    },
                    filter(f) {
                        return originFilter('People', f);
                    },
                    list(...ids){
                        return originList('People', ...ids);
                    }
                },
                Post: {
                    each(f) {
                       originEach('Post', f);
                    },
                    findById(id){
                        return originData['Post'][id];
                    },
                    filter(f) {
                        return originFilter('Post', f);
                    },
                    findByTag(tagName) {
                        return originFilter('Tag', (tag) => {
                            return tag.content === tagName;
                        });
                    },
                    list(...ids){
                        return originList('Post', ...ids);
                    },
                    findByDate(datetime) {  // 2016-12-01
                        let from = moment(datetime).valueOf(),
                            to = moment(datetime).add(1, 'day').valueOf();
                        return originFilter('Post', (post)=>{
                            let postTime = new Date(post.timestamp).getTime();
                            return postTime >= from && postTime < to;
                        });
                    }
                },
                Tag: {
                    each(f) {
                        originEach('Tag', f);
                    },
                    findById(id){
                        return originData['Tag'][id];
                    },
                    findByTag(tagName){
                        return originFilter('Tag', (tag) => {
                            return tag.content === tagName;
                        });
                    },
                    filter(f) {
                        return originFilter('Tag', f);
                    },
                    list(...ids){
                        return originList('Tag', ...ids);
                    },
                    findByPostId(id){
                        let post = originData['Post'][id];
                        return post.getTagList();
                    }
                },
                Comment: {
                    each(f) {
                        originEach('Comment', f);
                    },
                    findById(id){
                        return originData['Comment'][id];
                    },
                    filter(f) {
                        return originFilter('Comment', f);
                    },
                    findByWriterId(writerId){
                        let writers =  originFilter('People', (people) => {
                            return people.id === writerId;
                        });
                        return writers.length === 1 ? writers[0].getCommentList() : undefined;
                    },
                    list(...ids){
                        return originList('Comment', ...ids);
                    },
                    findByDate(datetime) {  // 2016-12-01
                        let from = moment(datetime).valueOf(),
                            to = moment(datetime).add(1, 'day').valueOf();
                        return originFilter('Comment', (comment)=>{
                            let postTime = new Date(comment.timestamp).getTime();
                            return postTime >= from && postTime < to;
                        });
                    }
                }
            };
        return dao[key];
    }

    load(...keys) {
        return this.run(function *() {
            this.data = {};
            let exists = yield this.isExist(this.directoryPath);
            if (!exists) {
                return;
            }
            let stats = yield this.getStats(this.directoryPath);
            if (!stats.isDirectory()) {
                return;
            }
            for (let key of keys) {
                this.data[key] = {};
                let filePath = path.join(this.directoryPath, `${key}.json`);
                exists = yield this.isExist(filePath);
                if (!exists) {
                    continue;
                }
                this.data[key] = (this.onLoad[key] || JSON.parse)(yield this.readFile(filePath));
            }
        });
    }

    loadPartial(...keys) {
        return this.run(function *() {
            this.data = {};
            for (let key of keys) {
                this.data[key] = {};
                let rootDirectoryPath = path.join(this.directoryPath, key);
                let rootExists = yield this.isExist(rootDirectoryPath);
                if (!rootExists) {
                    return;
                }
                let rootStats = yield this.getStats(rootDirectoryPath);
                if (!rootStats.isDirectory()) {
                    return;
                }
                let partialDirectories = yield this.getFileList(rootDirectoryPath); // .repo/${key}/partial-n
                for (let partialDirectory of partialDirectories) {
                    let partialDirectoryPath = path.join(rootDirectoryPath, partialDirectory);
                    let partialExists = yield this.isExist(partialDirectoryPath);
                    let partialStats = yield this.getStats(partialDirectoryPath);

                    if (!partialExists || !partialStats.isDirectory()) {
                        continue;
                    }
                    let files = yield this.getFileList(partialDirectoryPath, (file) => {
                        return path.extname(file) === '.json';
                    });
                    if (!files || files.length === 0) {
                        continue;
                    }
                    for (let file of files) {
                        let filePath = path.join(partialDirectoryPath, file);
                        this.data[key][path.parse(file).name] = JSON.parse(yield this.readFile(filePath));
                    }
                }
            }
        });
    }

    save(...keys) {
        !(this.data) && this.throwError(`The load() must be executed first.`);
        return this.run(function *() {
            let exists = yield this.isExist(this.directoryPath);
            if (!exists) {
                yield this.createDirectory(this.directoryPath);
            }
            let targetKeys = keys && keys.length > 0 ? keys : Object.keys(this.data);
            for (let key of targetKeys) {
                let filePath = path.join(this.directoryPath, `${key}.json`);
                yield this.writeFile(filePath, JSON.stringify(this.data[key]));
            }
        });
    }

    savePartial(...keys) {
        !(this.data) && this.throwError(`The loadPartial() must be executed first.`);
        return this.run(function *() {
            let directoryCache = {};
            let targetKeys = keys && keys.length > 0 ? keys : Object.keys(this.data);
            let getPartialPath = (id) => {
                if (parseInt(id, 10)) {
                    return `partial-${Math.floor(parseInt(id, 10) / 1000)}`;
                } else {
                    return `partial-${id.substring(0, 1)}`;
                }
            };
            for (let key of targetKeys) {
                let keyData = this.data[key];
                if (!keyData) {
                    continue;
                }
                for (let id of Object.keys(keyData)) {
                    let directoryPath = path.join(this.directoryPath, key, getPartialPath(id));
                    if (!directoryCache[directoryPath]) {
                        let exists = yield this.isExist(directoryPath);
                        if (!exists) {
                            yield this.createDirectory(directoryPath);
                        }
                        directoryCache[directoryPath] = true;
                    }
                    let filePath = path.join(directoryPath, `${id}.json`);
                    yield this.writeFile(filePath, JSON.stringify(keyData[id]));
                }
            }
        });
    }

    get(key, id, f = (o) => o) {
        !(key && id) && this.throwError();
        return new Promise((fulfill) => {
            if (!this.data[key]) {
                this.data[key] = {};
            }
            let result = this.data[key][id];
            fulfill(result ? f(result) : undefined);
        });
    }

    list(key, filter, f = (o) => o) {
        !(key && this.isFunction(filter)) && this.throwError();
        return new Promise((fulfill) => {
            let keyData = this.data[key];
            let result = [];
            if (!keyData) {
                fulfill(result);
                return;
            }
            for (let id of Object.keys(keyData)) {
                keyData[id] && filter(keyData[id]) && result.push(f(keyData[id]));
            }
            fulfill(result);
        });
    }

    getOne(key, filter) {
        !(key && this.isFunction(filter)) && this.throwError();
        return this.run(function *() {
            let list = yield this.list(key, filter);
            if (!list) {
                return;
            }
            list.length > 1 && this.log(`${key} has more than one data.`);
            return list[0];
        });
    }

    set(key, id, obj, f = (o) => o) {
        !(key && id && obj) && this.throwError();
        return new Promise((fulfill) => {
            if (!this.data[key]) {
                this.data[key] = {};
            }
            this.data[key][id] = f(obj);
            fulfill();
        });
    }

    clean(...keys) {
        let targetKeys = keys && keys.length > 0 ? keys : Object.keys(this.data);
        for (let key of targetKeys) {
            this.data[key] = undefined;
        }
    }

    toString() {
        let result = [];
        for (let key of Object.keys(this.data)) {
            result.push(`${key} : ${Object.keys(this.data[key]).length}`);
        }
        return result.join(EOL);
    }
}

module.exports = Repository;