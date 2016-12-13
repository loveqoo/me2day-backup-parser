'use strict';
const path = require('path');
const cheerio = require('cheerio');
const AsyncFsRunnable = require('./defines/AsyncFsRunnable');
const ResourceFactory = require('./ResourceFactory');

class Dispatcher extends AsyncFsRunnable {
    constructor(resourcePath) {
        super();
        this.resourcePath = resourcePath;
        this.factory = new ResourceFactory();
    }

    debug() {
        super.debug();
        for (let key of Object.keys(this)) {
            if (this[key] instanceof AsyncFsRunnable) {
                this[key].debugMode = this.debugMode;
            }
        }
    }

    execute(callback) {
        this.run(function *() {
            let report = {};
            const sequencer = this.factory.sequencer, repository = this.factory.repository;

            yield [sequencer.load(), repository.load('Post', 'People', 'Tag', 'Comment')];

            console.log(`  [INFO] Search files.`);

            yield this.factory.fileExplorer.explore(this.resourcePath, report);

            const progressBar = this.factory.newProgressBar('  Parsing [:bar] :percent :etas :file :content', report.total);

            console.log(`  [INFO] ${report.total} files Found.`);

            let passed = 0, parsed = 0;

            for (let directoryPath of Object.keys(report.dir)) {
                let targetParser;
                for (let parser of this.factory.parserList) {
                    if (parser.isMine(directoryPath)) {
                        targetParser = parser;
                        break;
                    }
                }
                if (!targetParser) {
                    this.log(`Not Found Parser : ${directoryPath}`);
                    progressBar.tick(report.dir[directoryPath], {
                        'file': directoryPath,
                        'content': 'Not Found Parser'
                    });
                    passed += report.dir[directoryPath];
                    continue;
                }

                let files = yield this.getFileList(directoryPath, file => path.extname(file) === '.html');
                let fileIterator = files[Symbol.iterator]();
                let parseEachFile = () => {
                    return this.run(function *() {
                        let item = fileIterator.next();
                        if (item.done) {
                            return;
                        }
                        let resourcePath = path.join(directoryPath, item.value);
                        yield this.run(function *() {
                            let baseName = path.basename(resourcePath);
                            let $ = yield this.factory.getCheerio(resourcePath);
                            yield targetParser.parse(resourcePath, $).then((content) => {
                                parsed += 1;
                                progressBar.tick({
                                    'file': baseName,
                                    'content': content
                                });
                            });
                        }).then(() => {
                            return parseEachFile();
                        });
                    });
                };
                yield Promise.resolve(parseEachFile());
            }
            yield [sequencer.save(), repository.save('Post', 'People', 'Tag', 'Comment')];

            console.log(`  [INFO] ${parsed} of ${report.total} files are parsed.`);
            console.log(`  [INFO] ${passed} of ${report.total} files are passed.`);

            const getLength = (target) =>{
                return Object.keys(repository.data[target]).length;
            };

            console.log(`  [INFO] Post(${getLength('Post')}), People(${getLength('People')}), Comment(${getLength('Comment')}), Tag(${getLength('Tag')})`);

            return {
                Post: repository.data.Post,
                People: repository.data.People,
                Tag: repository.data.Tag,
                Comment: repository.data.Comment
            };
        }, callback);
    }
}

module.exports = Dispatcher;