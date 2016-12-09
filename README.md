# Me2day Backup File Parser

## What is the Me2day?
> Me2day (Hangul: 미투데이) was a microblogging and social networking service in South Korea acquired and owned by NHN Corporation (present-day Naver Corporation)
\- [wiki](https://en.wikipedia.org/wiki/Me2day)

## How to parse your backup files
### If you only want to parse,
```sh
git clone https://github.com/loveqoo/me2day-backup-parser
cd me2day-backup-parser
npm install
node backup-parser.js ${your-backup-dir}
```
`${your-backup-dir} maybe ${backup-root}/me2day/yourId/post`

When the parse works is finished, a `.repo` folder is created.
And you can see the list of files as below.
```bash
total 50344
-rw-r--r--  1 anthony  staff    16M 12  9 00:44 Comment.json
-rw-r--r--  1 anthony  staff   1.2M 12  9 00:44 People.json
-rw-r--r--  1 anthony  staff   6.2M 12  9 00:44 Post.json
-rw-r--r--  1 anthony  staff   1.4M 12  9 00:44 Tag.json
-rw-r--r--  1 anthony  staff    43B 12  9 00:44 sequencer.json
```
### When you want to use the parse results directly,
```sh
node
> const parser = require('./index');
> parser.parse('${your-backup-dir}', 
    (result)=>{ 
        this.Post = result.Post; 
        this.People = result.People; 
        this.Tag = result.tag; 
        this.Comment = result.Comment
});
> console.log(`Post count: ${Object.keys(Post).length}`);
> console.log(`People count: ${Object.keys(People).length}`);
> console.log(`Tag count: ${Object.keys(Tag).length}`);
> console.log(`Comment count: ${Object.keys(Comment).length}`);
```
## License
MIT