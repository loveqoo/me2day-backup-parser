var fs = require('fs');
var path = require('path');

var sequencer = (function () {
    var o = {},
        filePath = path.join(__dirname, 'sequencer.json'),
        init = new Promise(function (fulfill, reject) {
            fs.access(filePath, fs.constants.R_OK, function (err) {
                if (err) {
                    reject(err);
                } else {
                    fulfill();
                }
            });
        }).then(function () {
            return new Promise(function (fulfill, reject) {
                fs.readFile(filePath, 'utf-8', function (err, data) {
                    if (err) {
                        reject(err);
                    } else {
                        fulfill(data);
                    }
                });
            });
        }, function () {
            o = {};
        }).then(function (data) {
            o = JSON.parse(data) || {};
        });
    return {
        get: function (obj, callback) {
            Promise.resolve(init).then(function () {
                var type = obj.constructor.name;
                if (!type) {
                    callback(new Error('type is invalid.'));
                    return;
                }
                o[type] = typeof o[type] === 'undefined' ? 1 : o[type] + 1;
                callback(null, o[type]);
            });
        },
        save: function () {
            Promise.resolve(init).then(function () {
                console.log('save ' + filePath);
                return new Promise(function (fulfill, reject) {
                    fs.access(filePath, fs.constants.R_OK, function (err) {
                        if (err) {
                            reject(err);
                        } else {
                            fulfill();
                        }
                    });
                });
            }).then(function () {
                return new Promise(function (fulfill, reject) {
                    fs.unlink(filePath, function () {
                        fulfill();
                    });
                });
            }).then(function () {
                return new Promise(function (fulfill, reject) {
                    fs.writeFile(filePath, JSON.stringify(o), 'utf-8', function (err) {
                        if (err) {
                            reject(err);
                        }
                    });
                });
            });
        }
    };
})();

module.exports = sequencer;
