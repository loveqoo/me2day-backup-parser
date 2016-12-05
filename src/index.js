"use strict";
const fs = require('graceful-fs');
const path = require('path');
const co = require('co');
const cheerio = require('cheerio');
const _ = require('lodash');
const ProgressBar = require('progress');
const Post = require('./post');

class Parser {
    constructor(resourcePath) {
        this.resourcePath = resourcePath;
        this.debugMode = true;
        this.defaultEncoding = 'utf-8';
        this.progressBar = undefined;
    }

    run(callback) {
        co.call(this, function *() {
            let exists = yield this.isExist();
            if (!exists) {
                throw new Error(`${this.resourcePath} is NOT exists.`);
            }
            let stats = yield this.getStats();
            if (stats.isDirectory()) {
                let files = yield this.getFiles();
                this.enableProgressBar();

                let promiseList = [];
                for (let file of files) {
                    promiseList.push(this.parse(path.join(this.resourcePath, file)));
                }
                yield promiseList;
            } else if (stats.isFile()) {
                yield this.parse(this.resourcePath);
            } else {
              throw new Error(`${this.resourcePath} is NOT directory or file.`);
            }
        }).then(()=> {
            callback();
        }).catch((e)=> {
            this.log(e);
        });
    }

    log(msg) {
      msg && this.debugMode && console.log(msg);
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

    getStats() {
        return new Promise((fulfill, reject) => {
            fs.lstat(this.resourcePath, (e, stats) => {
                if (e) {
                    reject(e);
                    this.log(e);
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
                    this.log(e);
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
            let baseName = path.basename(filePath);
            let post = Post.getPost($, baseName, filePath);
            if (this.progressBar) {
                this.progressBar.tick({
                    'file': baseName,
                    'timestamp': post.getTimestamp()
                });
            } else {
                this.log(`[INFO] File: ${filePath}`);
                this.log(`[INFO] ${post.id} ${post.content} at ${post.timestamp}`);
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

    enableProgressBar() {
        if (this.debugMode) {
          return;
        }
        this.progressBar = new ProgressBar('  Parsing [:bar] :percent :etas :file :timestamp', {
          complete: '=',
          incomplete: ' ',
          width: 20,
          total: files.length
        });
    }
}

module.exports = Parser;