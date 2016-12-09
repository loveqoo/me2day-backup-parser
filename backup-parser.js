'use strict';
const backupParser = require('./index');

// -- ex) node backup-parser.js ${resourcePath}
// -- ${resourcePath} is ${backup-root}/me2day/yourId/post
backupParser.parse(process.argv[2], ()=>{
    console.log('  Completed');
});