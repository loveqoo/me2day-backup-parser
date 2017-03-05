'use strict';
const index = require('./index');

// -- ex) node migration.js test/post.hbs
index.migration(process.argv[2], (post, out) =>{
    console.log(out);
});