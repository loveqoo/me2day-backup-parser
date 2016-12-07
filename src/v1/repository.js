'use strict';
const co = require('co');
const fs = require('graceful-fs');
const path = require('path');
const AsyncFsRunnable = require('../AsyncFsRunnable');

class Repository extends AsyncFsRunnable {

    constructor() {
        super();
        this.defaultFolderName = '.repo';
    }

    load(keys) {
        return this.run(function *() {
            this.data = {};
            for (let key of keys) {
                let directoryPath = path.join(__dirname, this.defaultFolderName, key);
                let exists = yield this.isExist(directoryPath);
                let stats = yield this.getStats(directoryPath);
                this.data[key] = {};
                if (exists && stats.isDirectory()) {
                    let files = yield this.getFileList(path.join(directoryPath, key), (file)=> {
                        return path.extname(file) === '.json';
                    });
                    for (let file of files) {
                        let filePath = path.join(directoryPath, file);
                      this.data[key] = JSON.parse(yield this.readFile(filePath));
                    }
                } else {
                    this.data[key] = {};
                }
            }
        });
    }

    loadPartial(keys) {
        return this.run(function *() {
            this.data = {};
            for (let key of keys) {
                let rootDirectoryPath = path.join(__dirname, this.defaultFolderName, key);
                let rootExists = yield this.isExist(rootDirectoryPath);
                let rootStats = yield this.getStats(rootDirectoryPath);
                this.data[key] = {};
                if (rootExists && rootStats.isDirectory()) {
                    let partialDirectories = yield this.getFileList(rootDirectoryPath); // .repo/${key}/partial-n
                    for (let partialDirectory of partialDirectories) {
                        let partialExists = yield this.isExist(partialDirectory);
                        let partialStats = yield this.getStats(partialDirectory);

                        if (!partialExists || !partialStats.isDirectory()) {
                            continue;
                        }
                        let files = yield this.getFileList(path.join(rootDirectoryPath, partialDirectory), (file)=> {
                            return path.extname(file) === '.json';
                        });
                        for (let file of files) {
                            let filePath = path.join(rootDirectoryPath, subDirectory, file);
                            let prevData = JSON.parse(yield this.readFile(filePath));
                            let id = path.parse(file).name;
                            this.data[key][id] = prevData;
                        }
                    }
                } else {
                    this.data[key] = {};
                }
            }
        });
    }

    save() {
        !(this.data) && this.throwError(`The load() must be executed first.`);
        return this.run(function *() {
            let directoryPath = path.join(__dirname, this.defaultFolderName);
            let exists = yield this.isExist(directoryPath);
            if (!exists) {
                yield this.createDirectory(directoryPath);
            }
            for (let key of this.data) {
                let filePath = path.join(directoryPath, `${key}.json`);
                yield this.writeFile(filePath, JSON.stringify(this.data[key]));
            }
        });
    }

    savePartial() {
        !(this.data) && this.throwError(`The loadPartial() must be executed first.`);
        return this.run(function *() {
            let directoryCache = {};
            for (let key of this.data) {
                for (let id of this.data[key]) {
                    let directoryPath = path.join(__dirname, this.defaultFolderName, key, `partial-${Math.floor(id / 1000)}`);
                    if (!directoryCache[directoryPath]) {
                        let exists = yield this.isExist(directoryPath);
                        if (!exists) {
                            yield this.createDirectory(directoryPath);
                        }
                        directoryCache[directoryPath] = true;
                    }
                    let filePath = path.join(directoryPath, `${id}.json`);
                    yield this.writeFile(filePath, JSON.stringify(this.data[key][id]));
                }
            }
        });
    }

    get(key, id, f = (o) => JSON.parse(o)) {
        !(key && id) && this.throwError();
        return new Promise((fulfill)=> {
            let result = this.data[key];
            fulfill(result ? f(result) : undefined);
        });
    }

    list(key, filter, f = (o) => JSON.parse(o)) {
        !(key && this.isFunction(filter)) && this.throwError();
        return new Promise((fulfill)=> {
            let keyData = this.data[key];
            let result = [];
            for (let id of keyData) {
                filter(keyData[id]) && result.push(f(keyData[id]));
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

    set(key, id, obj, f = (o) => JSON.stringify(o)) {
        !(key && id && obj) && this.throwError();
        return new Promise((fulfill)=> {
            this.data[key][id] = f(obj);
            fulfill();
        });
    }
}

// const repository = {
//
//     memory(filePathDefinition = {}) {
//         let o = {}, debugMode = false,
//             get = (key, id) => {
//                 !(key && id) && throwError();
//                 return o[key] ? o[key][id] : undefined;
//             },
//             getOne = (key, filter) => {
//                 !(key && filter && typeof filter === 'function') && throwError();
//                 let data = o[key];
//                 if (!data) {
//                     return;
//                 }
//                 let result = [];
//                 for (let id in data) {
//                     data.hasOwnProperty(id) && filter(data[id]) && result.push(data[id]);
//                 }
//                 result.length !== 1 && throwError(`${result.length} found.`);
//                 return result[0];
//             },
//             list = (key, filter) => {
//                 !(key && filter && typeof filter === 'function') && throwError();
//                 let data = o[key];
//                 let result = [];
//                 for (let id in data) {
//                     data.hasOwnProperty(id) && filter(data[id]) && result.push(data[id]);
//                 }
//                 return result;
//             },
//             set = (key, obj) => {
//                 !(key && obj && obj.id) && throwError();
//                 o[key] = o[key] || {};
//                 o[key][obj.id] = obj;
//             },
//             save = (key, callback) => {
//                 let filePath = filePathDefinition[key] || path.join(__dirname, '.repo', key + '.json');
//                 co(function *() {
//                     try {
//                         yield promises.existFile(filePath);
//                         yield promises.removeFile(filePath);
//                     } catch (e) {
//                         debugMode && console.log(e);
//                     }
//                     try {
//                         yield promises.writeFile(filePath, JSON.stringify(o[key]));
//                     } catch (e) {
//                         debugMode && console.log(e);
//                     }
//                 }).then(()=> {
//                     callback && (typeof callback === 'function') && callback();
//                 }).catch((err)=> {
//                     debugMode && console.log(err);
//                 });
//             },
//             load = (key, callback) => {
//                 let filePath = filePathDefinition[key] || path.join(__dirname, '.repo', key + '.json');
//                 co(function *() {
//                     try {
//                         yield promises.existFile(filePath);
//                     } catch (e) {
//                         debugMode && console.log(e);
//                     }
//                     try {
//                         return yield promises.readFile(filePath);
//                     } catch (e) {
//                         debugMode && console.log(e);
//                         return yield promises.resolve({});
//                     }
//                 }).then((data)=> {
//                     o[key] = data;
//                     callback && (typeof callback === 'function') && callback();
//                 }).catch((err)=> {
//                     debugMode && console.log(err);
//                 });
//             },
//             debug = ()=> {
//                 debugMode = !debugMode;
//             };
//         return {
//             get: get, getOne: getOne, set: set, list: list, save: save, load: load, debug: debug
//         };
//     },
//     file() {
//         let debugMode = false,
//             getFolderName = (key) => {
//                 return Math.floor(1000 / key).toString();
//             },
//             getDirectoryRootPath = (key) => {
//                 return path.join(__dirname, '.repo', key);
//             },
//             getDirectoryPath = (key)=> {
//                 return path.join(__dirname, '.repo', key, getFolderName(key));
//             },
//             getFilePath = (key, id)=> {
//                 return path.join(__dirname, '.repo', key, getFolderName(key), `${id}.json`);
//             },
//             getData = (key, id, callback) => {
//                 !(key) && throwError();
//                 let filePath = getFilePath(key, id);
//                 co(function *() {
//                     try {
//                         yield promises.existFile(filePath);
//                         return yield promises.readFile(filePath);
//                     } catch (e) {
//                         debugMode && console.log(e);
//                         return yield promises.resolve({});
//                     }
//                 }).then((data)=> {
//                     callback && (typeof callback === 'function') && callback(data);
//                 }).catch((err)=> {
//                     debugMode && console.log(err);
//                 });
//             },
//             setData = (key, id, obj, callback) => {
//                 !(key) && throwError();
//                 let directoryRootPath = getDirectoryRootPath(key);
//                 let directoryPath = getDirectoryPath(key);
//                 let filePath = getFilePath(key, id);
//                 co(function *() {
//                     let exists = false;
//                     try {
//                         yield promises.existFile(directoryRootPath);
//                         exists = true;
//                     } catch (e) {
//                         debugMode && console.log(e);
//                     }
//                     if (!exists) {
//                         try {
//                             yield promises.createDirectory(directoryRootPath);
//                         } catch (e) {
//                             debugMode && console.log(e);
//                         }
//                     }
//                     exists = false;
//                     try {
//                         yield promises.existFile(directoryPath);
//                         exists = true;
//                     } catch (e) {
//                         debugMode && console.log(e);
//                     }
//                     if (!exists) {
//                         try {
//                             yield promises.createDirectory(directoryPath);
//                         } catch (e) {
//                             debugMode && console.log(e);
//                         }
//                     }
//                     try {
//                         yield promises.existFile(filePath);
//                         yield promises.removeFile(filePath);
//                     } catch (e) {
//                         debugMode && console.log(e);
//                     }
//                     try {
//                         yield promises.writeFile(filePath, obj);
//                     } catch (e) {
//                         debugMode && console.log(e);
//                     }
//                 }).then(()=> {
//                     callback && (typeof callback === 'function') && callback();
//                 }).catch((err)=> {
//                     debugMode && console.log(err);
//                 });
//             },
//             get = (key, id, callback) => {
//                 !(key && id) && throwError();
//                 getData(key, id, (data)=> {
//                     callback(data);
//                 });
//             },
//             set = (key, obj, callback) => {
//                 !(key && obj && obj.id) && throwError();
//                 setData(key, obj.id, obj, ()=> {
//                     callback();
//                 });
//             },
//             debug = ()=> {
//                 debugMode = !debugMode;
//             };
//         co(function *() {
//             let directory = path(__dirname, '.repo'), exists = false;
//             try {
//                 yield promises.existFile(directory);
//                 exists = true;
//             } catch (e) {
//                 debugMode && console.log(e);
//             }
//             if (!exists) {
//                 try {
//                     yield promises.createDirectory(directory);
//                 } catch (e) {
//                     debugMode && console.log(e);
//                 }
//             }
//         }).then(()=> {
//             debugMode && console.log('all directory is created.');
//         }).catch((err)=> {
//             debugMode && console.log(err);
//         });
//         return {get: get, set: set, debug: debug};
//     }
// };

module.exports = Repository;