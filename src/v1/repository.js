'use strict';

const fs = require('fs');
const path = require('path');
const co = require('co');
const promises = require('./promises');
const throwError = (msg) => {
    throw new Error(msg || 'invalid parameter');
};

const repository = {
    /**
     * 메모리 객체 저장소.
     * o[구분자][아이디] = 객체
     *
     */
    memory(filePathDefinition = {}) {
        let o = {}, debugMode = false,
            get = (key, id) => {
                !(key && id) && throwError();
                return o[key] ? o[key][id] : undefined;
            },
            getOne = (key, filter) =>{
                !(key && filter && typeof filter === 'function') && throwError();
                let data = o[key];
                if (!data) {
                    return;
                }
                let result = [];
                for (let id in data) {
                    data.hasOwnProperty(id) && filter(data[id]) && result.push(data[id]);
                }
                result.length !== 1 && throwError(`${result.length} found.`);
                return result[0];
            },
            list = (key, filter) => {
                !(key && filter && typeof filter === 'function') && throwError();
                let data = o[key];
                let result = [];
                for (let id in data) {
                    data.hasOwnProperty(id) && filter(data[id]) && result.push(data[id]);
                }
                return result;
            },
            set = (key, obj) => {
                !(key && obj && obj.id) && throwError();
                o[key] = o[key] || {};
                o[key][obj.id] = obj;
            },
            save = (key, callback) => {
                let filePath = filePathDefinition[key] || path.join(__dirname, '.repo', key + '.json');
                co(function *() {
                    try {
                        yield promises.existFile(filePath);
                        yield promises.removeFile(filePath);
                    } catch (e) {
                        debugMode && console.log(e);
                    }
                    try {
                        yield promises.writeFile(filePath, JSON.stringify(o[key]));
                    } catch (e) {
                        debugMode && console.log(e);
                    }
                }).then(()=> {
                    callback && (typeof callback === 'function') && callback();
                }).catch((err)=> {
                    debugMode && console.log(err);
                });
            },
            load = (key, callback) => {
                let filePath = filePathDefinition[key] || path.join(__dirname, '.repo', key + '.json');
                co(function *() {
                    try {
                        yield promises.existFile(filePath);
                    } catch (e) {
                        debugMode && console.log(e);
                    }
                    try {
                        return yield promises.readFile(filePath);
                    } catch (e) {
                        debugMode && console.log(e);
                        return yield promises.resolve({});
                    }
                }).then((data)=> {
                    o[key] = data;
                    callback && (typeof callback === 'function') && callback();
                }).catch((err)=> {
                    debugMode && console.log(err);
                });
            },
            debug = ()=> {
                debugMode = !debugMode;
            };
        return {
            get: get, getOne:getOne, set: set, list: list, save: save, load: load, debug: debug
        };
    },
    file() {
        let debugMode = false,
            getFolderName = (key) =>{
                return Math.floor(1000 / key).toString();
            },
            getDirectoryRootPath = (key) =>{
                return path.join(__dirname, '.repo', key);
            },
            getDirectoryPath = (key)=> {
                return path.join(__dirname, '.repo', key, getFolderName(key));
            },
            getFilePath = (key, id)=> {
                return path.join(__dirname, '.repo', key, getFolderName(key), `${id}.json`);
            },
            getData = (key, id, callback) => {
                !(key) && throwError();
                let filePath = getFilePath(key, id);
                co(function *() {
                    try {
                        yield promises.existFile(filePath);
                        return yield promises.readFile(filePath);
                    } catch (e) {
                        debugMode && console.log(e);
                        return yield promises.resolve({});
                    }
                }).then((data)=> {
                    callback && (typeof callback === 'function') && callback(data);
                }).catch((err)=> {
                    debugMode && console.log(err);
                });
            },
            setData = (key, id, obj, callback) => {
                !(key) && throwError();
                let directoryRootPath = getDirectoryRootPath(key);
                let directoryPath = getDirectoryPath(key);
                let filePath = getFilePath(key, id);
                co(function *() {
                    let exists = false;
                    try {
                        yield promises.existFile(directoryRootPath);
                        exists = true;
                    } catch (e) {
                        debugMode && console.log(e);
                    }
                    if (!exists) {
                        try {
                            yield promises.createDirectory(directoryRootPath);
                        } catch (e) {
                            debugMode && console.log(e);
                        }
                    }
                    exists = false;
                    try {
                        yield promises.existFile(directoryPath);
                        exists = true;
                    } catch (e) {
                        debugMode && console.log(e);
                    }
                    if (!exists) {
                        try {
                            yield promises.createDirectory(directoryPath);
                        } catch (e) {
                            debugMode && console.log(e);
                        }
                    }
                    try {
                        yield promises.existFile(filePath);
                        yield promises.removeFile(filePath);
                    } catch (e) {
                        debugMode && console.log(e);
                    }
                    try {
                        yield promises.writeFile(filePath, obj);
                    } catch (e) {
                        debugMode && console.log(e);
                    }
                }).then(()=> {
                    callback && (typeof callback === 'function') && callback();
                }).catch((err)=> {
                    debugMode && console.log(err);
                });
            },
            get = (key, id, callback) => {
                !(key && id) && throwError();
                getData(key, id, (data)=> {
                    callback(data);
                });
            },
            set = (key, obj, callback) => {
                !(key && obj && obj.id) && throwError();
                setData(key, obj.id, obj, ()=> {
                    callback();
                });
            },
            debug = ()=> {
                debugMode = !debugMode;
            };
        co(function *() {
            let directory = path(__dirname, '.repo'), exists = false;
            try {
                yield promises.existFile(directory);
                exists = true;
            } catch (e) {
                debugMode && console.log(e);
            }
            if (!exists) {
                try {
                    yield promises.createDirectory(directory);
                } catch (e) {
                    debugMode && console.log(e);
                }
            }
        }).then(()=> {
            debugMode && console.log('all directory is created.');
        }).catch((err)=> {
            debugMode && console.log(err);
        });
        return {get: get, set: set, debug: debug};
    }
};

module.exports = repository;