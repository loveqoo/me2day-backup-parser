'use strict';
const fs = require('fs');
const defaultEncoding = 'utf-8';

module.exports = {
    isDirOrFile(dirOrFilePath, debugMode = false) {
        return new Promise((fulfill, reject) => {
            fs.lstat(dirOrFilePath, (err, stats) => {
                if (err) {
                    reject(err);
                    debugMode && console.log(err);
                } else {
                    fulfill(stats);
                }
            });
        })
    },
    existFile(filePath, debugMode = false) {
        return new Promise((fulfill, reject) => {
            fs.access(filePath, fs.constants.R_OK, (err) => {
                if (err) {
                    reject(err);
                    debugMode && console.log(`[INFO] ${filePath} is NOT exist.`);
                } else {
                    fulfill();
                }
            });
        });
    },
    createDirectory(directoryPath){
        return new Promise((fulfill)=> {
            fs.mkdir(directoryPath, ()=> {
                fulfill();
            })
        });
    },
    readDirectory(directoryPath){
        return new Promise(function (fulfill, reject) {
            fs.readdir(directoryPath, 'utf-8', function (err, files) {
                if (err) {
                    reject(err);
                } else {
                    fulfill(files);
                }
            });
        })
    },
    readFile(filePath, debugMode = false){
        return new Promise((fulfill, reject) => {
            fs.readFile(filePath, defaultEncoding, (err, data) => {
                if (err) {
                    reject(err);
                    debugMode && console.log(`[INFO] ${filePath} is NOT loaded.`);
                } else {
                    fulfill(JSON.parse(data));
                    debugMode && console.log(`[INFO] ${filePath} is loaded.`);
                }
            });
        });
    },
    writeFile(filePath, data, debugMode = false) {
        return new Promise((fulfill, reject) => {
            fs.writeFile(filePath, JSON.stringify(data), defaultEncoding, (err) => {
                if (err) {
                    reject(err);
                    debugMode && console.log(`[INFO] ${filePath} could NOT saved.`);
                } else {
                    debugMode && console.log(`[INFO] ${filePath} is saved.`);
                    fulfill();
                }
            });
        });
    },
    removeFile(filePath, debugMode = false) {
        return new Promise((fulfill, reject) => {
            fs.unlink(filePath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    fulfill();
                    debugMode && console.log(`[INFO] ${filePath} is removed.`);
                }
            });
        });
    }
};