var parser = require('./src/parser');
var path = require('path');

var bootstrap = (function () {
    var init = function () {
        var setting = {};
        for (var domain in parser.domain) {
            if (parser.domain.hasOwnProperty(domain)) {
                setting[domain] = {
                    repositoryType: 'memory'
                }
            }
        }
        return setting;
    };
    var getContext = function (setting) {
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
        context.set('directoryPath', '');
        context.set('resourcePath', '');
        context.set('config', {flag: flag, path: pathInfo});
        context.set('before-file-remove', true);
        context.set('max-parse-count', -1);
        context.set('save-sequence', false);
        return context;
    };
    return {
        init: init,
        getContext: getContext,
        execute: function (context, callback) {
            if (context.get('directoryPath')) {
                parser.parse.directory(context, callback);
            } else {
                parser.parse.file(context, callback);
            }
        }
    };
})();

module.exports = bootstrap;