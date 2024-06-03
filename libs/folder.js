'use strict';
/**
 * External module Dependencies.
 */
var path = require('path'),
  when = require('when');
/**
 * Internal module Dependencies .
 */

const helper = require('../utils/helper');

function ExtractFolders() {}

ExtractFolders.prototype = {
  saveFolder: function () {
    return when.promise(function (resolve, reject) {
      try {
        var folderJSON = [
          {
            urlPath: '/assets/migrationasset',
            uid: 'migrationasset',
            content_type: 'application/vnd.contenstack.folder',
            tags: [],
            name: 'Migration',
            is_dir: true,
            parent_uid: null,
            _version: 1,
          },
        ];
        helper.writeFile(
          path.join(process.cwd(), config.data, 'assets', 'folders'),
          JSON.stringify(folderJSON, null, 4)
        );

        resolve();
      } catch (error) {
        console.log(error);
        reject();
      }
    });
  },
  start: function () {
    successLogger(`Creating assets folder...`);
    var self = this;
    return when.promise(function (resolve, reject) {
      self
        .saveFolder()
        .then(function () {
          resolve();
        })
        .catch(function () {
          reject();
        });
    });
  },
};

module.exports = ExtractFolders;