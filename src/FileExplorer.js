const path = require('path');
const AsyncFsRunnable = require('./defines/AsyncFsRunnable');

class FileExplorer extends AsyncFsRunnable {

    constructor() {
        super();
    }

    explore(filePath, report) {
        if (!report) {
            report = {};
        }
        if (!report['dir']) {
            report['dir'] = {};
        }
        if (!report['ext']) {
            report['ext'] = {};
        }
        if (typeof report['total'] === 'undefined') {
            report['total'] = 0;
        }
        return this.run(function *() {
            let stats = yield this.getStats(filePath);
            if (stats.isDirectory()) {
                this.log(`Found Directory: ${filePath}`);
                let files = yield this.getFileList(filePath,
                    file => {
                        let baseName = path.basename(file);
                        return baseName !== '.DS_Store';
                    });
                for (let file of files) {
                    yield this.explore(path.join(filePath, file), report);
                }
                return;
            }
            if (stats.isFile()) {
                if (path.extname(filePath) !== '.html') {
                    return;
                }
                let parentDirectory = path.join(filePath, '..'),
                    extName = path.extname(filePath);
                if (report.dir[parentDirectory]) {
                    report.dir[parentDirectory] += 1;
                } else {
                    report.dir[parentDirectory] = 1;
                }
                if (report.ext[extName]) {
                    report.ext[extName] += 1;
                } else {
                    report.ext[extName] = 1;
                }
                report.total += 1;
                this.log(`Found File: ${filePath}`);
                return;
            }
            this.log(`${filePath} is NOT directory or file.`);
        });
    }
}

module.exports = FileExplorer;