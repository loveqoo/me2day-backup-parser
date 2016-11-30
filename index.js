var parser = require('./src/parser');
var repository = require('./src/repository');
var path = require('path');
var fs = require('fs');

var bootstrap = (function () {
    var config = function () {
            var setting = {};
            for (var domain in parser.domain) {
                if (parser.domain.hasOwnProperty(domain)) {
                    setting[domain] = {
                        repositoryType: 'memory'
                    }
                }
            }
            return setting;
        },
        getContext = function (setting) {
            var pathInfo = {}, flag = {}, context = parser.createContext();
            for (var domain in parser.domain) {
                if (parser.domain.hasOwnProperty(domain) && setting[domain]) {
                    if (setting[domain].repositoryType === 'file') {
                        flag[domain] = 'file';
                    } else {
                        flag[domain] = 'memory';
                    }
                    pathInfo[domain] = path.join(__dirname, (domain + '.json'));
                }
            }
            context.set('resourcePath', '');
            context.set('config', {flag: flag, path: pathInfo});
            context.set('before-file-remove', true);
            context.set('max-parse-count', -1);
            context.set('save-sequence', false);
            return context;
        },
        prepare = function (context) {
            var pathInfo = context.get('config').path;
            for (var domain in pathInfo) {
                pathInfo.hasOwnProperty(domain) && pathInfo[domain]
                && fs.existsSync(pathInfo[domain]) && fs.unlinkSync(pathInfo[domain]);
            }
            parser.repository = context.set('repository', repository(context.get('config')));
        },
        finish = function () {

        };
    return {
        config: config,
        getContext: getContext,
        execute: function (context, callback) {
            new Promise(function (fulfill, reject) {
                fs.lstat(context.get('resourcePath'), function (err, stats) {
                    if (err) {
                        reject(err);
                    } else {
                        fulfill(stats);
                    }
                });
            }).then(function (stats) {
                prepare(context);
                if (stats.isDirectory()) {
                    parser.parse.directory(context, callback);
                }
                if (stats.isFile()) {
                    parser.parse.file(context, callback);
                }
                finish(context);
            });
        }
    };
})();

module.exports = bootstrap;