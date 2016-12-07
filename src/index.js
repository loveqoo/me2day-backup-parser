"use strict";
const path = require('path');
const cheerio = require('cheerio');
const ProgressBar = require('progress');
const AsyncFsRunnable = require('./AsyncFsRunnable');
const getPost = require('./post');

class Parser extends AsyncFsRunnable {
    constructor(resourcePath) {
        super();
        this.resourcePath = resourcePath;
        this.progressBar = undefined;
    }

    parse(callback) {
        this.run(function *() {
            let exists = yield this.isExist(this.resourcePath);
            if (!exists) {
                this.throwError(`${this.resourcePath} is NOT exists.`);
            }
            let stats = yield this.getStats(this.resourcePath);
            if (stats.isDirectory()) {
                let files = yield this.getFileList(this.resourcePath, (file)=> {
                    return path.extname(file) === '.html';
                });
                this.enableProgressBar(files.length);

                let promiseList = [];
                for (let file of files) {
                    promiseList.push(this.parseFile(path.join(this.resourcePath, file)));
                }
                yield promiseList;
            } else if (stats.isFile()) {
                yield this.parseFile(this.resourcePath);
            } else {
                this.throwError(`${this.resourcePath} is NOT directory or file.`);
            }
        }, callback);
    }

    parseFile(filePath) {
        return this.run(function *() {
            let data = yield this.readFile(filePath);
            let $ = cheerio.load(data, {normalizeWhitespace: true});
            let baseName = path.basename(filePath);
            let post = yield getPost($, baseName, filePath);
            if (this.progressBar) {
                this.progressBar.tick({
                    'file': baseName,
                    'content': post.content.substring(0, 30)
                });
            } else {
                this.log(`[INFO] File: ${filePath}`);
                this.log(`[INFO] ${post.id} ${post.content} at ${post.timestamp}`);
            }
        });
    }

    enableProgressBar(fileLength) {
        if (this.debugMode) {
            return;
        }
        this.progressBar = new ProgressBar('  Parsing [:bar] :percent :etas :file :content', {
            complete: '=',
            incomplete: ' ',
            width: 30,
            total: fileLength
        });
    }
}

module.exports = Parser;