'use strict';
const co = require('co');
const fs = require('graceful-fs');
const path = require('path');
const ProgressBar = require('progress');
const AsyncFsRunnable = require('./AsyncFsRunnable');

class Repository extends AsyncFsRunnable {

    constructor() {
        super();
        this.pwd = process.env.PWD;
        this.defaultFolderName = '.repo';
        this.showProgressBar = false;
        this.directoryPath = path.join(this.pwd, this.defaultFolderName);
    }

    load(keys) {
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
                this.data[key] = JSON.parse(yield this.readFile(filePath));
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
                    let files = yield this.getFileList(partialDirectoryPath, (file)=> {
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
            if (this.showProgressBar) {
                let saveFileCount = 0;
                for (let key of keys) {
                    saveFileCount += Object.keys(this.data[key]).length;
                }
                var progressBar = new ProgressBar('   Saving [:bar] :percent :etas :status', {
                    complete: '=',
                    incomplete: ' ',
                    width: 30,
                    total: saveFileCount
                });
            }
            let targetKeys = keys && keys.length > 0 ? keys : Object.keys(this.data);
            for (let key of targetKeys) {
                let filePath = path.join(this.directoryPath, `${key}.json`);
                yield this.writeFile(filePath, JSON.stringify(this.data[key]));
                this.showProgressBar && progressBar.tick({
                    'status': `${filePath}`
                });
            }
        });
    }

    savePartial(...keys) {
        !(this.data) && this.throwError(`The loadPartial() must be executed first.`);
        return this.run(function *() {
            let directoryCache = {};
            let targetKeys = keys && keys.length > 0 ? keys : Object.keys(this.data);
            let getPartialPath = (id)=>{
                if (parseInt(id, 10)) {
                    return `partial-${Math.floor(parseInt(id,10) / 1000)}`;
                } else {
                    return `partial-${id.substring(0,1)}`;
                }
            };
            for (let key of targetKeys) {
                let keyData = this.data[key];
                if (!keyData) {
                    continue;
                }
                for (let id of Object.keys(keyData)) {
                    let directoryPath = path.join(this.directoryPath, key, getPartialPath(id));
                    // let exists = yield this.isExist(directoryPath);
                    // if (!exists) {
                    //     yield this.createDirectory(directoryPath);
                    // }
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
        return new Promise((fulfill)=> {
            if (!this.data[key]) {
                this.data[key] = {};
            }
            let result = this.data[key][id];
            fulfill(result ? f(result) : undefined);
        });
    }

    list(key, filter, f = (o) => o) {
        !(key && this.isFunction(filter)) && this.throwError();
        return new Promise((fulfill)=> {
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
        return new Promise((fulfill)=> {
            if (!this.data[key]) {
                this.data[key] = {};
            }
            this.data[key][id] = f(obj);
            fulfill();
        });
    }

    clean(...keys){
        let targetKeys = keys && keys.length > 0 ? keys : Object.keys(this.data);
        for (let key of targetKeys) {
            this.data[key] = undefined;
        }
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