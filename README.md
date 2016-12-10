# Me2day Backup File Parser

## 미투데이란?
> 미투데이(me2day)는 대한민국의 마이크로블로그 서비스였다. 2014년 6월 30일 서비스가 종료되었다.
\- [wiki](https://en.wikipedia.org/wiki/Me2day)

## 파싱을 하는 목적
백업 파일을 묵혀두기엔 너무 아깝고, 다른 블로그로 이전할 때 백업한 데이터를 사용하기 위해 필요성을 느꼈습니다.

기존 `html`형식의 백업파일은 바로 보기에는 좋지만, 데이터를 뽑아내기 어려워 가공할 수 없었습니다. 

따라서 JSON 형식으로 데이터를 저장합니다.

## 파싱을 하기 전에
본 프로그램은 [nodejs](https://nodejs.org/ko/) 기반으로 작성되어 있습니다.

## 백업 파일을 파싱하는 방법
### 1. 묻고 따지지 않고 바로 파싱하기.
```sh
git clone https://github.com/loveqoo/me2day-backup-parser
cd me2day-backup-parser
npm install
node backup-parser.js ${your-backup-dir}
```
`${your-backup-dir}`은 아마도 다음과 같은 위치일 겁니다. 
> ${backup-root}/me2day/yourId/post

파싱 작업이 완료되면, 실행한 위치에 `.repo` 폴더가 생성됩니다.
그리고 그 안에 들어가면 아래처럼 5개의 파싱된 파일을 볼 수가 있습니다.
```bash
total 50344
-rw-r--r--  1 aaa  staff    16M 12  9 00:44 Comment.json
-rw-r--r--  1 aaa  staff   1.2M 12  9 00:44 People.json
-rw-r--r--  1 aaa  staff   6.2M 12  9 00:44 Post.json
-rw-r--r--  1 aaa  staff   1.4M 12  9 00:44 Tag.json
-rw-r--r--  1 aaa  staff    43B 12  9 00:44 sequence.json
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
#### 아래처럼 파싱 결과를 읽어서 repository 객체에 접근할 수 있습니다.
단, `.repo` 폴더에 파싱한 결과가 있어야 가능합니다.
```sh
node
> const parser = require('./index');
> let repository = parser.load(()=> { console.log('done');});
> done
Post : 8973
People : 2563
Tag : 19401
Comment : 88512
> let post = Post[Object.keys(repository.data.Post)[0]];
> console.log(post.toString());
Post ID: 1
Content:  내 방에만 불켜고 문 열어 놓고 웃통 벗고 모기를 유인하고 있음. 
Time: 2009-08-21 01:59:00
Tags: me2term 3마리는 잡은거 같음
Metoo: watson
Comment: 
2009-08-21 02:03:00 tabby  앗! 우리아부지랑 똑같은 행동!! 아빠!! 
2009-08-21 02:08:00 꾸우  tabby 아빠는 첨 듣네.ㅋ 
2009-08-21 02:18:00 루치아  왜… 그러시나요?? 심심한가요?ㅋ 
2009-08-21 02:19:00 꾸우  루치아 아니요, 잠은 안오는데 모기는 싫고 그래서 모기도 잡을 겸 요러고 있어요. 
2009-08-21 07:14:00 watson  모기를 유혹하다니 매력(?)쟁이시군요 전 요새인기가 떨어졌는지 안물리는^^; 
2009-08-21 07:22:00 꾸우  watson 모기로 잠을 설치면 이를 악물고 잡고 자게 됩니다. 
2009-08-21 09:05:00 minimini  유훗..매력덩어리..모기마저 유혹하는..멋진 남자..꾸엄마 
2009-08-21 10:03:00 꾸우  미니미니♥ 문열고 시원하게 자기 위한 생존방법이에요.ㅋ 
2009-08-21 13:06:00 v미노v  ㅎㅎㅎㅎ; 멋지시네요!!! 
2009-08-21 20:53:00 ツバキ  살신성인..이군요 

```
## 파싱한 데이터 접근
### Post
추후 업데이트
### People
추후 업데이트
### Tag
추후 업데이트
### Comment
추후 업데이트
## License
MIT