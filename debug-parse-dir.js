var bootstrap = require('./index');

var setting = bootstrap.init();
var heapdump = require('heapdump');
setting['People']['repositoryType'] = 'memory';
setting['Post']['repositoryType'] = 'file';
setting['Comment']['repositoryType'] = 'file';
setting['Tag']['repositoryType'] = 'file';

var context = bootstrap.getContext(setting);
context.set('directoryPath', '/Users/anthony/Documents/backup/me2day/garangnip/post');
//context.set('resourcePath', '/Users/anthony/Documents/backup/me2day/garangnip/post/p.pPOOM.iOI.html');
context.set('debug', true);
context.set('max-parse-count', 10);
context.set('before-file-remove', false);
context.set('save-sequence', true);
context.set('onExit', function () {
    console.log('save people');
    context.get('repository').save('People');
});
bootstrap.execute(context, function (post) {
    if (global.gc) {
        var heapTotal = process.memoryUsage().heapTotal;
        var heapUsed = process.memoryUsage().heapUsed;
        var heapUsedPercent = heapUsed / heapTotal * 100;

        //console.log('Memory: ' + heapUsedPercent + '% used');
        if (heapUsedPercent > 90) {
            global.gc();
            // heapdump.writeSnapshot(function(err, filename) {
            //     console.log('dump written to', filename);
            //     process.exit();
            // });
        }
    }
    // console.log(new Date() + ': ' + post.title
    //     + '(metoo: ' + post.metooPeopleIdList.length
    //     + ', comment:' +  post.commentIdList.length +')');
});
