var cheerio = require('cheerio');
var toMarkDown = require('to-markdown');
var fs = require('fs');

var sequencer = (function () {
    var o = {};
    return {
        get: function (obj) {
            var type = obj.constructor.name;
            if (!type) {
                throw new Error('type is invalid.');
            }
            if (typeof o[type] === 'undefined') {
                o[type] = 1;
                return 1;
            } else {
                var seq = o[type];
                seq++;
                return seq;
            }
        }
    };
})();

var repository = (function () {
  var o = {},
    get = function (type, id) {
      return o[type][id];
    },
    set = function (type, obj) {
      if (!o[type]) {
        o[type] = {};
      }
      o[type][obj.id] = obj;
    };
  return {get:get, set: set};
})();

var Me2day = {
    parse: {
      getRootContainer: function (resourcePath) {
        if (fs.existsSync(resourcePath)) {
          throw new Error('invalid resource path : ' + resourcePath);
        }
        var resource = fs.readFileSync(resourcePath, 'utf-8');
        var $ = cheerio.load(resource, {normalizeWhitespace: true});
        return $('div#container');
      },
      getPost: function ($container) {
        var $postBody = $container.find('p.post_body');
        var $timestamp = $postBody.find('span.post_permalink');
        var $authorContainer = $container.find('div.profile_box_inner');

        var post = new Me2day.domain.Post();
        post.text = toMarkdown(Me2day.util.extractContent($postBody.html()));
        post.timestamp = Me2day.util.parseDate($timestamp.html());
        //post.author =
      },
      getMetoo: function ($container) {
        var $metooContainer = $container.find('div.me2box.type_7');
      },
      getCommentList: function ($container) {
        var $commentContainer = $container.find('div.comments_list_wrap');
      }
    },
    util : {
        parseDate : function (dateString) {
            return new Date('20' + dateString.replace('.', '-').replace('.', '-').replace(' ', 'T') + ':00+09:00');
        },
        extractContent: function (contentHtml) {
            return contentHtml.replace(/\<span class\=\"post_permalink\"\>.+\<\/span\>/gi,'');
        },
        extractPeopleIdByImageUri: function (imageUri) {
            var regex = new RegExp("/img/images/user/(.+)/profile.png"), peopleId;
            if (imageUri.includes('/img/images/user/')) {
                var parsed = regex.exec(imageUri);
                if (parsed.length > 1) {
                    peopleId = parsed[1];
                }
            } else {
                var parsed = imageUri.split('/')[3].split('_'),
                    validLength = parsed.length - 2,
                    temp = [];
                parsed.forEach(function (str, index) {
                    if (index < validLength) {
                        temp.push(str);
                    }
                });
                peopleId = temp.join('_');
            }
            return peopleId;
        }
    },
    repository: repository,
    domain: {
      People: function (id) {
        this.id = id;
        this.nickname;
        this.postList = [];
        this.commentList = [];
      },
      Post: function (id) {
        this.id = id || sequencer.get(this);
        this.title;
        this.text;
        this.timestamp;
        this.author;
        this.metoo;
        this.tags = [];
        this.commentList = [];
      },
      Comment: function (id) {
        this.id = id || sequencer.get(this);
        this.text;
        this.timestamp;
        this.people;
        this.post;
      },
      Icon: function () {
        this.uri;
        this.text;
      },
      Metoo: function () {
        this.post;
        this.count;
        this.peopleList = [];
      }
    },
    getPostPackage: function (html) {
        var $ = cheerio.load(html, {normalizeWhitespace: true});
        var $container = $('div.container');
        var $postBody = $container.find('p.post_body');

        var post = new Me2day.Post();
        post.textHtml = toMarkDown($postBody('p.post_body').html());
        post.text = post.textHtml.replace(/\r\n/g, '\n')
            .replace('<a class="profile_popup no_link">', '')
            .replace('</a>', '');
        var $timestamp = $postBody.find('span.post_permalink');
        post.timestampRaw = $timestamp.text();
        post.timestamp ='20' + post.timestampRaw.trim().replace('.', '-').replace('.', '-');

        var $commentBox = $('div.section_wrap.second_section');
        $commentBox.find('div.comment_item').each(function () {
            var commentWriter = new Me2day.People();
            var profileImgUri = $(this).find('img').attr('src');
            var regex = /user\/(.+)\//g;
            var regexResult = regex.exec(profileImgUri);
            if (regexResult && regexResult.length > 1) {
                commentAuthor.id = regexResult[1];
            }
            commentAuthor.nickname = $(this).find('a.profile_popup.no_link').text();
            var comment = new Me2day.Comment();
        });

        var $iconBox = $('a.selected_icon.list_icon_box');
        var $profile = $('div.profile_master');
        var $nickname = $('a.txt_nickname.no_link');

    }
};

exports.Me2day = Me2day;