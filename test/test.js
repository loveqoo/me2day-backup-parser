'use strict';

const assert = require('assert'),
    it = require('mocha').it,
    describe = require('mocha').describe,
    path = require('path'),
    Dispatcher = require('../src/Dispatcher');

describe('Parse', function () {
    this.timeout(2000);
    it('# parse file', function (done) {
        let dispatcher = new Dispatcher(path.join(__dirname, 'resource.html'));
        dispatcher.debug();
        dispatcher.execute((result)=>{
            console.log('--- SUMMARY ---');
            console.log(`Post count: ${Object.keys(result.Post).length}`);
            console.log(`People count: ${Object.keys(result.People).length}`);
            console.log(`Tag count: ${Object.keys(result.Tag).length}`);
            console.log(`Comment count: ${Object.keys(result.Comment).length}`);
            if (Object.keys(result.Post).length > 0) {
                console.log('--- POST SAMPLE ---');
                console.log(result.Post[Object.keys(result.Post)[0]].toString());
            }
            done();
        });
    });
});

describe('Extract Anchor', function () {
    it('extract', function () {
        let content = '<a class="profile_popup no_link">dasti</a> 얼마나 많이 찔라고 거기까지 들릴까낭..ㅋ<a class="profile_popup no_link">dasti</a> 얼마나 많이 찔라고 거기까지 들릴까낭..ㅋ';
        let matchedAnchorTextList = content.match(/<a.*?>([\s\S]*?)<\/a>/g);
        if (!matchedAnchorTextList || matchedAnchorTextList.length <= 0) {
            return;
        }
        let replaceMap = new Map();
        matchedAnchorTextList.forEach((matchedAnchorText)=>{
            let matchedNickname = matchedAnchorText.match(/([\w])+(?=<\/a>)/g);
            if (!matchedNickname || matchedNickname.length <= 0) {
                return;
            }
            replaceMap.set(matchedAnchorText, '<a data-id="hoho">' + matchedNickname[0] +'</a>');
        });
        var result = content;
        for (var [key, value] of replaceMap) {
          result = result.replace(new RegExp(key, "g"), value);
        }
        console.log(result);
    });
});