'use strict';
const index = require('./index');

// -- ex) node migration.js test/post.hbs
// -- ${resourcePath} is ${backup-root}/me2day/yourId/post
index.migration(process.argv[2], (post, out) =>{
    console.log(out);
});