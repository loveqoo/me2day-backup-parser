# Me2day Backup File Parser

## 미투데이란?
> Me2day (Hangul: 미투데이) was a microblogging and social networking service in South Korea acquired and owned by NHN Corporation (present-day Naver Corporation)
\- [wiki](https://en.wikipedia.org/wiki/Me2day)

## 백업 파일을 파싱하는 방법
### 1. 묻고 따지지 않고 바로 파싱하기.
```sh
git clone https://github.com/loveqoo/me2day-backup-parser
cd me2day-backup-parser
npm install
node backup-parser.js ${your-backup-dir}
```
`${your-backup-dir} maybe ${backup-root}/me2day/yourId/post`

파싱 작업이 완료되면, `.repo` 폴더가 생성됩니다.
그리고 그 안에 들어가면 아래처럼 5개의 파일을 볼 수가 있습니다.
```bash
total 50344
-rw-r--r--  1 aaa  staff    16M 12  9 00:44 Comment.json
-rw-r--r--  1 aaa  staff   1.2M 12  9 00:44 People.json
-rw-r--r--  1 aaa  staff   6.2M 12  9 00:44 Post.json
-rw-r--r--  1 aaa  staff   1.4M 12  9 00:44 Tag.json
-rw-r--r--  1 aaa  staff    43B 12  9 00:44 sequencer.json
```
### 2. 파싱한 뒤 콜백함수를 이용해서 곧바로 데이터를 보기
#### 콜백함수에는 파싱한 결과를 파라미터로 받을 수 있습니다.
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
> console.log(Post[Object.keys(Post)[0]].toString());
```
## 파싱 후에도 데이터를 접근해보기
#### 아래처럼 파싱 결과를 로드하여 repository 객체에 접근할 수 있습니다.
단, `.repo` 폴더에 파싱한 결과가 있어야 가능합니다.
```sh
node
> const parser = require('./index');
> let repository = parser.load(()=> { console.log('done');});
> console.log(repository.toString());
```
## License
MIT