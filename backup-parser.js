'use strict';
const index = require('./index');

// -- ex) node backup-parser.js ${resourcePath}
// -- ${resourcePath} is ${backup-root}/me2day/yourId/post
index.parse(process.argv[2], ()=>{
    console.log('  [INFO] Completed');
});