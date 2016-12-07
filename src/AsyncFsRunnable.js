'use strict';
const fs = require('graceful-fs');
const mkdirp = require('mkdirp');
const co = require('co');

class AsyncFsRunnable {

    constructor() {
        this.debugMode = false;
        this.defaultEncoding = 'utf-8';
    }

    debug() {
        this.debugMode = !this.debugMode;
    }

    log(msg) {
        msg && this.debugMode && console.log(msg);
    }

    isFunction (f) {
        return f && (typeof f === 'function');
    }

    throwError(msg = 'Invalid Parameter') {
        throw new Error(msg);
    }

    run(generator, callback) {
        !(generator.constructor.name === 'GeneratorFunction')
        && this.throwError('Generator Function is required.');
        let f = co.call(this, generator)
            .catch((e)=> {
                this.log(e);
            });
        if (this.isFunction(callback)) {
            f.then(() => {
                return callback(arguments);
            });
        }
        return f;
    }

    isExist(filePath) {
        return new Promise((fulfill) => {
            fs.access(filePath, fs.constants.R_OK, (e) => {
                if (e) {
                    fulfill(false);
                    this.log(`[INFO] ${filePath} is NOT exists.`);
                } else {
                    fulfill(true);
                    this.log(`[INFO] ${filePath} is exists.`);
                }
            });
        });
    }

    getStats(filePath) {
        return new Promise((fulfill, reject) => {
            fs.lstat(filePath, (e, stats) => {
                if (e) {
                    reject(e);
                    this.log(e);
                } else {
                    fulfill(stats);
                    this.log(`[INFO] ${filePath} is ${stats.isDirectory() ? 'directory.' : 'file'}.`);
                }
            });
        });
    }

    getFileList(filePath, filter) {
        return new Promise((fulfill, reject) => {
            fs.readdir(filePath, this.defaultEncoding, (e, files) => {
                if (e) {
                    reject(e);
                    this.log(e);
                } else {
                    if (filter && (typeof filter === 'function')) {
                        let filtered = [];
                        for (let file of files) {
                            filter(file) && filtered.push(file);
                        }
                        this.log(`[INFO] ${filePath}' has ${filtered.length} files.`);
                        fulfill(filtered);
                    } else {
                        this.log(`[INFO] ${filePath}' has ${files.length} files.`);
                        fulfill(files);
                    }
                }
            });
        });
    }

    readFile(filePath) {
        return new Promise((fulfill, reject) => {
            fs.readFile(filePath, this.defaultEncoding, (e, data) => {
                if (e) {
                    reject(e);
                    this.log(`[INFO] ${filePath} is NOT loaded.`);
                } else {
                    fulfill(data);
                    this.log(`[INFO] ${filePath} is loaded.`);
                }
            });
        });
    }

    writeFile(filePath, data) {
        return new Promise((fulfill, reject) => {
            fs.writeFile(filePath, data, this.defaultEncoding, (e) => {
                if (e) {
                    reject(e);
                    this.log(`[INFO] ${filePath} could NOT saved.`);
                } else {
                    this.log(`[INFO] ${filePath} is saved.`);
                    fulfill();
                }
            });
        });
    }

    createDirectory(directoryPath) {
        return new Promise((fulfill, reject)=> {
            mkdirp(directoryPath, (e)=>{
                if (e) {
                    reject(e);
                    this.log(`[INFO] ${directoryPath} could NOT create.`);
                } else {
                    fulfill();
                    this.log(`[INFO] ${directoryPath} created.`);
                }
            });
        });
    }

    removeFile(filePath) {
        return new Promise((fulfill, reject) => {
            fs.unlink(filePath, (e) => {
                if (e) {
                    reject(e);
                } else {
                    fulfill();
                    this.log(`[INFO] ${filePath} is removed.`);
                }
            });
        });
    }
}
module.exports = AsyncFsRunnable;