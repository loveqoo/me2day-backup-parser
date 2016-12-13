const toMarkdown = require('to-markdown');
const AsyncFsRunnable = require('./AsyncFsRunnable');

class Parsable extends AsyncFsRunnable {
    constructor(parameter) {
        super();
        this.toMarkdown = toMarkdown;
        parameter.assign(this);
    }

    isMine(resourcePath) {
        this.throwError('NOT IMPLEMENTED.');
    }

    parse(resourcePath, $) {
        this.throwError('NOT IMPLEMENTED.');
    }

    updateRepository(targetMap) {
        return this.run(function *() {
            let savePromiseList = [];
            for (let key of Object.keys(targetMap)) {
                let value = targetMap[key];
                if (Array.isArray(value)) {
                    for (let valueItem of value) {
                        savePromiseList.push(this.run(function *() {
                            yield this.repository.set(key, valueItem.id, valueItem);
                        }));
                    }
                } else {
                    savePromiseList.push(this.run(function *() {
                        yield this.repository.set(key, value.id, value);
                    }));
                }
            }
            return yield savePromiseList;
        });
    };

}

module.exports = Parsable;
