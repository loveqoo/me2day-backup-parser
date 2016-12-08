'use strict';
const Dispatcher = require('./src/Dispatcher');

// -- ex) node index.js ${resourcePath}
// -- ${resourcePath} is ${backup-root}/me2day/yourId/post
new Dispatcher(process.argv[2]).execute();
