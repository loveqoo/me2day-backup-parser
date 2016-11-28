var assert = require('assert'),
    it = require('mocha').it,
    describe = require('mocha').describe,
    path = require('path'),
    fs = require('fs'),
    cheerio = require('cheerio'),
    toMarkdown = require('to-markdown'),
    me2day = require('../index').Me2day;

describe('Resource file', function () {
    describe('# Find Resource File', function () {
        it('show current resource path', function () {
            var resourcePath = path.join(__dirname, 'resource.html');
            assert.equal(fs.existsSync(resourcePath), true, 'Not Found! -> ' + resourcePath);
        });
        it('read resource file', function () {
            var resourcePath = path.join(__dirname, 'resource.html');
            var html = fs.readFileSync(resourcePath, 'utf-8');
            assert.equal(html.length, 34800, 'Resource length is Not 34759, but ' + html.length);
        });
    });
    describe('# Parse Resource file', function () {
        var resource = fs.readFileSync(path.join(__dirname, 'resource.html'), 'utf-8');
        var $ = cheerio.load(resource, {normalizeWhitespace: true});
        it('parse html - root entity', function () {
            var $container = $('div#container');
            var $postBody = $container.find('p.post_body');
            assert.equal($container.length, 1,
                'resource.html has one node, div#container but ' + $container.length);
            assert.equal($postBody.length, 1,
                'resource.html has one node, p.post_body but ' + $postBody.length);
        });
    });
});

describe('Extract data from Resource file', function () {
    var resource = fs.readFileSync(path.join(__dirname, 'resource.html'), 'utf-8');
    var $ = cheerio.load(resource, {normalizeWhitespace: true});
    var $container = $('div#container');
    var $metooContainer = $container.find('div.me2box.type_7');
    var $commentContainer = $('div.comments_list_wrap');
    var $postBody = $container.find('p.post_body');
    describe('# Timestamp', function () {
        var $timestamp = $postBody.find('span.post_permalink');
        it('By Manual method', function () {
            var timestamp = '20' + $timestamp.html().replace('.', '-').replace('.', '-').replace(' ', 'T') + ':00+09:00';
            var timestampDate = new Date(timestamp);
            assert.equal(timestampDate.getFullYear(), 2014, 'Year:' + timestampDate.getFullYear());
            assert.equal((timestampDate.getMonth() + 1), 6, 'Month:' + (timestampDate.getMonth() + 1));
            assert.equal(timestampDate.getDate(), 30, 'Day:' + timestampDate.getDate());

            assert.equal(timestampDate.getHours(), 19, 'Hour:' + timestampDate.getHours());
            assert.equal(timestampDate.getMinutes(), 57, 'Minute:' + timestampDate.getMinutes());
            assert.equal(timestampDate.getSeconds(), 0, 'Second:' + timestampDate.getSeconds());
        });
        it('By Me2day.util.parseDate', function () {
            assert.equal(me2day.util.parseDate($timestamp.html()).getFullYear(), 2014);
        });
    });
    describe('# Post content', function () {
        var rawHtml = $postBody.html();
        var postHtml = rawHtml.replace(/\<span class\=\"post_permalink\"\>.+\<\/span\>/gi, '');
        it('By Manual Method', function () {
          assert.equal(toMarkdown(postHtml), '<a class="profile_popup no_link">tabby</a> 님 손이 이렇게 고운 지 몰랐어요.');
        });
        it('By Me2day.util.extractContent', function () {
          assert.equal(toMarkdown(me2day.util.extractContent(postHtml)), toMarkdown(postHtml));
        });
        it('Extract Author', function () {
          var $authorContainer = $container.find('div.profile_box_inner');
          var $image = $authorContainer.find('img.profile_img');
          console.log($image.html());
          // TODO : test
        });
    });
    describe('# Metoo information', function () {
        it('Metoo count', function () {
            assert.equal(parseInt($metooContainer.find('span.me2_count.display_none.big').text().trim(), 10), 23);
        });
        it('Metoo people by Manual', function () {
            var $metooPeople = $metooContainer.find('a.pi_s.profile_popup.no_link img'),
                regex = new RegExp("/img/images/user/(.+)/profile.png"), metooPeople = [];

            $metooPeople.each(function () {
                var $image = $(this), src = $image.prop('src'), peopleId;
                if (src.includes('/img/images/user/')) {
                    var parsed = regex.exec(src);
                    if (parsed.length > 1) {
                        peopleId = parsed[1];
                    }
                } else {
                    var parsed = src.split('/')[3].split('_'),
                        validLength = parsed.length - 2,
                        temp = [];
                    parsed.forEach(function (str, index) {
                        if (index < validLength) {
                            temp.push(str);
                        }
                    });
                    peopleId = temp.join('_');
                }
                metooPeople.push({id: peopleId, nickname: $image.prop('alt')});
            });
            //console.log(metooPeople);
            assert.equal(metooPeople.length, 23);
        });
        it('Metoo people by util.extractPeopleIdByImageUri', function () {
            var $metooPeople = $metooContainer.find('a.pi_s.profile_popup.no_link img'),
                metooPeople = [];
            $metooPeople.each(function () {
                metooPeople.push(me2day.util.extractPeopleIdByImageUri($(this).prop('src'), $(this)));
            });
            assert.equal(metooPeople.length, 23);
        });
    });
    describe('# Comment Content', function () {
        it('By Manual', function () {
          $commentContainer.find('div.comment_item').each(function () {
              var $comment = $(this), $image = $comment.find('a.comment_profile.profile_popup.no_link img'),
                $commentTimestamp = $comment.find('span.comment_time'),
                commentText = toMarkdown($comment.find('p.para').html());
              //console.log(me2day.util.extractPeopleIdByImageUri($image.attr('src')) + ','
               // + $image.attr('alt') + ',' + me2day.util.parseDate($commentTimestamp.text()) + ',' + commentText);
          });
        });
    });
});