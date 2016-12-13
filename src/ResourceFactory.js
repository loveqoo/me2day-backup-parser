const AsyncFsRunnable = require('./defines/AsyncFsRunnable');
const Repository = require('./Repository');
const Sequencer = require('./Sequencer');
const Parameter = require('./Parameter');
const FileExplorer = require('./FileExplorer');
const ProgressBar = require('progress');
const cheerio = require('cheerio');

const PostParser = require('./parsers/PostParser');

const Domain = require('./defines/Domain');
const Me2day = Domain.Me2day;
const People = Domain.People;
const Post = Domain.Post;
const Tag = Domain.Tag;
const Comment = Domain.Comment;

class ResourceFactory extends AsyncFsRunnable {
    constructor() {
        super();
        this.repository = new Repository();
        this.sequencer = new Sequencer();
        this.fileExplorer = new FileExplorer();

        Me2day.prototype.repository = this.repository;
        this.repository.onLoad.Post = rawText => Post.fromJSON(rawText);
        this.repository.onLoad.Tag = rawText => Tag.fromJSON(rawText);
        this.repository.onLoad.Comment = rawText => Comment.fromJSON(rawText);
        this.repository.onLoad.People = rawText => People.fromJSON(rawText);

        const parameter = new Parameter();
        parameter.set('repository', this.repository);
        parameter.set('sequencer', this.sequencer);
        parameter.set('factory', this);

        this.parserList = [];
        this.parserList.push(new PostParser(parameter));
    }

    getCheerio(filePath) {
        return this.run(function *() {
            let data = yield this.readFile(filePath);
            return cheerio.load(data, {normalizeWhitespace: true});
        });
    }

    newPost() {
        return this.run(function *() {
            return new Post(yield this.sequencer.get('Post'));
        });
    }

    newTag() {
        return this.run(function *() {
            return new Tag(yield this.sequencer.get('Tag'));
        });
    }

    newComment() {
        return this.run(function *() {
            return new Comment(yield this.sequencer.get('Comment'));
        });
    }

    newPeople(peopleId) {
        return new People(peopleId);
    }

    newProgressBar(format, fileLength) {
        // '  Parsing [:bar] :percent :etas :file :content'
        return new ProgressBar(format, {
            complete: '=',
            incomplete: ' ',
            width: 30,
            total: fileLength
        });
    }
}

module.exports = ResourceFactory;