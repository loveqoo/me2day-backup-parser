const path = require('path');
const AsyncFsRunnable = require('../defines/AsyncFsRunnable');
const ResourceFactory = require('../ResourceFactory');

class Migration extends AsyncFsRunnable {
    constructor() {
        super();
        this.factory = new ResourceFactory();
    }

    initRepository() {
        return this.run(function *() {
            if (this.repository) {
                return;
            }
            const repository = this.factory.repository;
            yield repository.load('Post', 'People', 'Tag', 'Comment');
            this.repository = repository;
        });
    }

    getMeta() {
        return this.run(function *() {
            yield this.initRepository();
            return this.repository.getMeta();
        });
    }

    copyFiles(from, to, callback) {
        !(from && to) && this.throwError();
        return this.run(function *() {
            let stats = yield this.getStats(from);
            if (stats.isDirectory()) {
                this.log(`Found Directory: ${from}`);
                let targetExists = yield this.isExist(to);
                if (!targetExists) {
                    yield this.createDirectory(to);
                }
                let files = yield this.getFileList(from,
                    file => {
                        let baseName = path.basename(file);
                        return baseName !== '.DS_Store';
                    });
                for (let file of files) {
                    yield this.copyFiles(path.join(from, file), path.join(to, file));
                }
                return;
            }
            if (stats.isFile()) {
                this.copyFile(from, to);
            }
            this.log(`${from} is NOT directory or file.`);
        }, callback);
    }
}

module.exports = Migration;