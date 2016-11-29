var fs = require('fs');
var path = require('path');

var error = function (msg) {
    throw new Error(msg || 'invalid parameter');
};

var memoryRepository = function (_path) {
    var o = {}, path = _path || {},
        get = function (type, id) {
            !(type && id) && error();
            var key = type.name ? type.name : type;
            return o[key] ? o[key][typeof id === 'function' ? id() : id] : undefined;
        },
        list = function (type, filter) {
            !(type && filter && typeof filter === 'function') && error();
            var key = type.name ? type.name : type;
            var data = o[key];
            var result = [];
            for (var id in data) {
                data.hasOwnProperty(id) && filter(data[id]) && result.push(data[id]);
            }
            return result;
        },
        set = function (type, obj) {
            !(type && obj && obj.id) && error();
            var key = type.name ? type.name : type;
            o[key] = o[key] || {};
            o[key][obj.id] = obj;
        },
        save = function (type) {
            var key = type.name ? type.name : type;
            var filePath = path[key];
            fs.existsSync(filePath) && fs.unlinkSync(filePath);
            fs.writeFileSync(filePath, JSON.stringify(o[key]), 'utf-8');
        },
        load = function (type) {
            var key = type.name ? type.name : type;
            var filePath = path[key];
            o[key] = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : {};
        };
    return {
        get: get, set: set, list: list, save: save, load: load
    };
};

var fileRepository = function (_path) {
    var path = _path || {},
        getData = function (type) {
            !(type && path[type.name || type]) && error();
            var filePath = path[type.name || type];
            var data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : {};
            return data['fromJSON'] ? data['fromJSON'](data) : data;
        },
        setData = function (type, obj) {
            !(type && path[type.name || type]) && error();
            var filePath = path[type.name || type];
            fs.existsSync(filePath) && fs.unlinkSync(filePath);
            fs.writeFileSync(filePath, JSON.stringify(obj), 'utf-8');
        };
    return (function () {
        var get = function (type, id) {
                !(type && id) && error();
                var data = getData(type);
                return data ? data[id] : undefined;
            },
            list = function (type, filter) {
                !(type && filter && typeof filter === 'function') && error();
                var data = getData(type);
                var result = [];
                for (var id in data) {
                    data.hasOwnProperty(id) && filter(data[id]) && result.push(data[id]);
                }
                return result;
            },
            set = function (type, obj) {
                !(type && obj && obj.id) && error();
                var data = getData(type);
                data[obj.id] = obj;
                setData(type, data);
            };
        return {get: get, set: set, list: list};
    })();
};

var repository = function (config) {
    !(config && config.flag && config.path) && error();
    var flag = config.flag || {},
        _memoryRepository = memoryRepository(config.path),
        _fileRepository = fileRepository(config.path),
        get = function (type, id) {
            !(type && id && flag[type.name || type]) && error();
            return flag[type.name || type] === 'memory' ? _memoryRepository.get(type, id) : _fileRepository.get(type, id);
        },
        list = function (type, filter) {
            !(type && filter && typeof filter === 'function') && error();
            return flag[type.name || type] === 'memory' ? _memoryRepository.list(type, filter) : _fileRepository.list(type, filter);
        },
        set = function (type, obj) {
            !(type && obj && obj.id) && error();
            flag[type.name || type] === 'memory' ? _memoryRepository.set(type, obj) : _fileRepository.set(type, obj);
        },
        save = function (type) {
            !(type) && error();
            flag[type.name || type] === 'memory' && _memoryRepository.save(type);
        },
        load = function (type) {
            !(type) && error();
            flag[type.name || type] === 'memory' && _memoryRepository.load(type);
        };
    return {
        get: get, set: set, list: list, save: save, load: load
    };
};

module.exports = repository;