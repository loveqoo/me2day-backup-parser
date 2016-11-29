var me2day = require('./index').Me2day;

me2day.repository = me2day.createRepository('file');
var context = me2day.createContext();
context.set('mode', 'file');
context.set('debug', true);
context.set('directoryPath', '/Users/anthony/Documents/backup/me2day/garangnip/post');

me2day.parse.directory(context, function (post) {
    if (global.gc) {
        var heapTotal = process.memoryUsage().heapTotal;
        var heapUsed = process.memoryUsage().heapUsed;
        var heapUsedPercent = heapUsed / heapTotal * 100;

        //console.log('Memory: ' + heapUsedPercent + '% used');
        if (heapUsedPercent > 90) {
            global.gc();
        }
    }
    console.log(new Date() + ': ' + post.title
        + '(metoo: ' + post.metooPeopleIdList.length
        + ', comment:' +  post.commentIdList.length +')');
});
me2day.save();
