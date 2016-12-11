"use strict";
const path = require('path');
const cheerio = require('cheerio');
const ProgressBar = require('progress');
const AsyncFsRunnable = require('./AsyncFsRunnable');
const Parser = require('./Parser');

class Dispatcher extends AsyncFsRunnable {
    constructor(resourcePath) {
        super();
        this.resourcePath = resourcePath;
        this.progressBar = undefined;
        this.parser = new Parser();
    }

    /**
     * me2dayObject = {Post:Object, Tag:Object, People:Object, Comment:Object}
     * @param callback : function (me2dayObjects)
     */
    execute(callback) {
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

                //files.splice(2, Number.MAX_VALUE);

                yield this.parser.init();
                let fileIterator = files[Symbol.iterator]();
                let parseEachFile = () => {
                    return this.run(function *(){
                        let item = fileIterator.next();
                        if (item.done) {
                            return this.parser.done();
                        }
                        yield this.parseFile(path.join(this.resourcePath, item.value)).then(()=> {
                            return parseEachFile();
                        });
                        return this.parser.getAllTargets();
                    });
                };
                this.enableProgressBar(files.length);
                return yield Promise.resolve(parseEachFile());
            } else if (stats.isFile()) {
                yield this.parser.init();
                yield this.parseFile(this.resourcePath);
                return yield this.parser.done();
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
            let post = yield this.parser.execute($, filePath, (post) => {
                if (this.progressBar) {
                    this.progressBar.tick({
                        'file': baseName,
                        'content': post.title
                    });
                } else {
                    this.log(`[INFO] File: ${filePath}`);
                    this.log(`[INFO] ${post.id} ${post.content} at ${post.timestamp}`);
                }
            });
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

module.exports = Dispatcher;