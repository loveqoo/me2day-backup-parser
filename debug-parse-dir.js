var bootstrap = require('./index');
var heapdump = require('heapdump');

var config = bootstrap.config();
config['People']['repositoryType'] = 'memory';
config['Post']['repositoryType'] = 'file';
config['Comment']['repositoryType'] = 'file';
config['Tag']['repositoryType'] = 'file';

var context = bootstrap.getContext(config);
context.set('resourcePath', '/Users/anthony/Documents/backup/me2day/garangnip/post');
//context.set('resourcePath', '/Users/anthony/Documents/backup/me2day/garangnip/post/p.pPOOM.iOI.html');
context.set('debug', true);
context.set('onExit', function () {
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
