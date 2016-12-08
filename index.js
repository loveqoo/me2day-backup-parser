'use strict';
const path = require('path');
const fs = require('fs');
const co = require('co');
const cheerio = require('cheerio');
const promises = require('./src/v1/promises');
const parser = require('./src/v1/parser');
const repository = require('./src/Repository');
const context = require('./src/v1/context');


const bootstrap = (function () {
    var config = function () {
            var setting = {};
            // for (var domain in parser.domain) {
            //     if (parser.domain.hasOwnProperty(domain)) {
            //         setting[domain] = {
            //             repositoryType: 'memory'
            //         }
            //     }
            // }
            return setting;
        },
        getContext = function (setting) {
            // var pathInfo = {}, flag = {}, context = parser.createContext();
            // for (var domain in parser.domain) {
            //     if (parser.domain.hasOwnProperty(domain) && setting[domain]) {
            //         if (setting[domain].repositoryType === 'file') {
            //             flag[domain] = 'file';
            //         } else {
            //             flag[domain] = 'memory';
            //         }
            //         pathInfo[domain] = path.join(__dirname, (domain + '.json'));
            //     }
            // }
            // context.set('resourcePath', '');
            // context.set('config', {flag: flag, path: pathInfo});
            // context.set('before-file-remove', true);
            // context.set('max-parse-count', -1);
            // context.set('save-sequence', false);
            return context();
        },
        prepare = function (context) {
            // var pathInfo = context.get('config').path;
            // for (var domain in pathInfo) {
            //     pathInfo.hasOwnProperty(domain) && pathInfo[domain]
            //     && fs.existsSync(pathInfo[domain]) && fs.unlinkSync(pathInfo[domain]);
            // }
            // parser.repository = context.set('repository', repository(context.get('config')));
        },
        getCheerio = (resourcePath, callback)=> {
            !(resourcePath) && throwError();
            co(function *() {
                try {
                    yield promises.existFile(resourcePath);
                    return yield promises.readFile(resourcePath);
                } catch (e) {
                    console.log(e);
                }
            }).then((data)=> {
                callback(cheerio.load(data, {normalizeWhitespace: true}));
            }).catch((err)=> {
                console.log(err);
            });
        },
        finish = () => {

        };
    return {
        config: config,
        getContext: getContext,
        execute (context, callback) {
            co(function *() {
                let stats = yield promises.isDirOrFile(context.get('resourcePath'));

                prepare(context);

                if (stats.isDirectory()) {
                    let files = yield promises.readDirectory(context.get('resourcePath'));
                    files = files.filter((file)=> {
                        return path.extname(file) === '.html';
                    });
                    let parsePromises = [];
                    for (let file of files) {
                        parsePromises.push(new Promise((fulfill, reject) => {
                            getCheerio(file, ($)=> {
                                context.set('$', $);
                                try {
                                    parser.file(context, ()=> {
                                        callback();
                                        fulfill();
                                    });
                                } catch (e) {
                                    reject(e);
                                }
                            });
                        }));
                    }
                    return yield Promise.all(parsePromises);
                }
                if (stats.isFile()) {
                    return yield new Promise((fulfill, reject)=> {
                        getCheerio(context.get('resourcePath'), ($)=> {
                            context.set('$', $);
                            try {
                                parser.file(context, ()=>{
                                    callback();
                                    fulfill();
                                });
                            } catch(e) {
                                reject(e);
                                console.log(e);
                            }
                        });
                    });
                }
            }).then(()=> {
                finish(context);
            }).catch((err)=> {
                console.log(err);
            });
        }
    };
})();

module.exports = bootstrap;