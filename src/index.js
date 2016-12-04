"use strict";
const fs = require('graceful-fs');
const path = require('path');
const co = require('co');
const cheerio = require('cheerio');
const _ = require('lodash');
const ProgressBar = require('progress');

class Parser {
    constructor(resourcePath) {
        this.resourcePath = resourcePath;
        this.debugMode = true;
        this.defaultEncoding = 'utf8';
        this.progressBar = undefined;
    }

    run(callback) {
        co.call(this, function *() {
            let exists = yield this.isExist();
            if (!exists) {
                throw new Error(this.resourcePath + ' is NOT exists.');
            }
            let stats = yield this.isDirectory();
            if (stats.isDirectory()) {
                let files = yield this.getFiles();
                if (!this.debugMode) {
                    this.progressBar = new ProgressBar('  Parsing [:bar] :percent :etas :file :timestamp', {
                        complete: '=',
                        incomplete: ' ',
                        width: 20,
                        total: files.length
                    });
                }

                let promiseList = [];
                for (let file of files) {
                    promiseList.push(this.parse(path.join(this.resourcePath, file)));
                }
                yield promiseList;
            } else {
                return yield this.parse(this.resourcePath);
            }
        }).then(()=> {
            callback();
        }).catch((e)=> {
            this.log(e);
        });
    }

    log(msg) {
        if (!msg || !this.debugMode) {
            return;
        }
        console.log(msg);
    }

    isExist() {
        return new Promise((fulfill) => {
            fs.access(this.resourcePath, fs.constants.R_OK, (e) => {
                if (e) {
                    fulfill(false);
                    this.log(`[INFO] ${this.resourcePath} is NOT exists.`);
                } else {
                    fulfill(true);
                    this.log(`[INFO] ${this.resourcePath} is exists.`);
                }
            });
        });
    }

    isDirectory() {
        return new Promise((fulfill, reject) => {
            fs.lstat(this.resourcePath, (e, stats) => {
                if (e) {
                    reject(err);
                    this.debugMode && console.log(e);
                } else {
                    fulfill(stats);
                    this.log(`[INFO] ${this.resourcePath} is ${stats.isDirectory() ? 'directory.' : 'file'}.`);
                }
            });
        });
    }

    getFiles() {
        return new Promise((fulfill, reject) => {
            fs.readdir(this.resourcePath, this.defaultEncoding, (e, files) => {
                if (e) {
                    reject(e);
                } else {
                    files = files.filter((file)=> {
                        return path.extname(file) === '.html';
                    });
                    fulfill(files);
                    this.log(`[INFO] ${this.resourcePath}' has ${files.length} files.`);
                }
            });
        });
    }

    parse(filePath) {
        return co.call(this, function *() {
            let data = yield this.getData(filePath);
            let $ = cheerio.load(data, {normalizeWhitespace: true});
            if (!this.debugMode) {
                this.progressBar.tick({
                    'file': path.basename(filePath),
                    'timestamp': $('span.post_permalink').text()
                });
            }
        }).catch((e)=> {
            this.log(e);
        });
    }

    getData(filePath) {
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
}

module.exports = Parser;