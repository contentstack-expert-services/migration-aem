const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs');
const helper = require('../utils/helper');

var guard = require('when/guard'),
  parallel = require('when/parallel'),
  when = require('when'),
  axios = require('axios');

const chalk = require('chalk');

var assetConfig = config.modules.asset,
  assetFolderPath = path.resolve(config.data, assetConfig.dirName),
  assetMasterFolderPath = path.resolve(process.cwd(), 'logs', 'assets'),
  failedJSON =
    helper.readFile(path.join(assetMasterFolderPath, 'aem_failed')) || {};
failedJSON =
  helper.readFile(path.join(assetMasterFolderPath, 'aem_failed')) || {};

if (!fs.existsSync(assetFolderPath)) {
  mkdirp.sync(assetFolderPath);
  helper.writeFile(path.join(assetFolderPath, 'assets'));
  mkdirp.sync(assetMasterFolderPath);
} else {
  if (!fs.existsSync(path.join(assetFolderPath, 'assets.json')))
    helper.writeFile(path.join(assetFolderPath, 'assets'));
  if (!fs.existsSync(assetMasterFolderPath)) {
    mkdirp.sync(assetMasterFolderPath);
  }
}

//Reading a File
var assetData = helper.readFile(path.join(assetFolderPath, 'assets.json'));

function ExtractAssets() {}

ExtractAssets.prototype = {
  saveAsset: function (assetUrl, retryCount) {
    var self = this;
    return when.promise(async function (resolve, reject) {
      try {
        const processUrl = async (url, isFileReference) => {
          // const name = (url?.match(/\/content\/dam\/bcs\/projects\/(.*)/) ||
          //   [])[1]?.replace(/\//g, ' ');
          const name =
            isFileReference?.props?.imageAltText ??
            (url?.match(/\/content\/dam\/(.*)/) || [])[1]?.replace(/\//g, ' ');

          if (name) {
            const uid = url
              .replace(/[^a-zA-Z0-9]+/g, '_')
              .replace(/^_+|_+$/g, '')
              .toLowerCase();

            url = `https://express.com${url}`;

            const assetPath = path.resolve(assetFolderPath, uid);

            if (fs.existsSync(path.join(assetPath, name))) {
              console.log(
                'An asset with id',
                chalk.red(uid),
                'and name',
                chalk.red(name),
                'already present.'
              );
              resolve(uid);
            } else {
              try {
                const response = await axios.get(url, {
                  responseType: 'arraybuffer',
                });
                if (response.status === 200) {
                  mkdirp.sync(assetPath);
                  fs.writeFileSync(path.join(assetPath, name), response.data);
                  const stats = fs.lstatSync(path.join(assetPath, name));

                  assetData[uid] = {
                    uid: uid,
                    urlPath: `/assets/${uid}`,
                    status: true,
                    file_size: `${stats.size}`,
                    tag: [],
                    filename: name,
                    url: url,
                    is_dir: false,
                    parent_uid: 'migrationasset',
                    _version: 1,
                    title: name,
                    publish_details: [],
                  };

                  console.log(
                    'An asset with id',
                    chalk.green(uid),
                    'and name',
                    chalk.green(name),
                    'got downloaded successfully.'
                  );

                  const assetVersionInfoFile = path.resolve(assetPath, uid);
                  helper.writeFile(
                    assetVersionInfoFile,
                    JSON.stringify(assetData[uid], null, 4)
                  );

                  if (failedJSON[uid]) {
                    delete failedJSON[uid];
                  }

                  helper.writeFile(
                    path.join(assetMasterFolderPath, 'asset.json'),
                    JSON.stringify(assetData, null, 4)
                  );

                  resolve(uid);
                } else {
                  throw new Error(
                    `Failed with status code: ${response.status}`
                  );
                }
              } catch (err) {
                failedJSON[uid] = {
                  failedUid: uid,
                  name: name,
                  url: url,
                  reason_for_error: err.message,
                };
                helper.writeFile(
                  path.join(assetMasterFolderPath, 'aem_failed.json'),
                  JSON.stringify(failedJSON, null, 4)
                );
                resolve(uid);
              }
            }
          }
        };

        // if (assetUrl?.props?.imageUrl) {
        //   await processUrl(assetUrl?.props?.imagePath, true); // true indicates it's a fileReference
        // }
        if (assetUrl?.imageUrl) {
          await processUrl(assetUrl?.imagePath, true); // true indicates it's a fileReference
        }
        if (assetUrl?.props?.videoPath) {
          await processUrl(assetUrl?.props?.videoPath, false); // false indicates it's a videoAsset
        }
        resolve();
      } catch (error) {
        console.log('error', error);
        reject();
      }
    });
  },

  getAsset: function (attachments) {
    var self = this;

    return when.promise(async function (resolve, reject) {
      // Initialize assetData
      try {
        var _getAsset = [];

        // check total length of asset attachment pass from the getAllAssets
        for (var i = 0, total = attachments.length; i < total; i++) {
          _getAsset.push(
            (function (data) {
              if (data?.props?.cards) {
                self.getAsset(data?.props?.cards);
              } else {
                return function () {
                  return self.saveAsset(data, 0);
                };
              }
            })(attachments[i])
          );
        }

        var guardTask = guard.bind(null, guard.n(5));
        _getAsset = _getAsset.map(guardTask);
        var taskResults = parallel(_getAsset);
        taskResults
          .then(function (results) {
            helper.writeFile(
              path.join(assetFolderPath, 'assets'),
              JSON.stringify(assetData, null, 4)
            );
            helper.writeFile(
              path.join(assetMasterFolderPath, 'aem_failed'),
              JSON.stringify(failedJSON, null, 4)
            );
            resolve(results);
          })
          .catch(function (e) {
            errorLogger('failed to download assets: ', e);
            resolve();
          });
        resolve();
      } catch (error) {
        console.log('error', error);
        reject();
      }
    });
  },

  getAllAssets: function ({ templatePaths }) {
    var self = this;
    return when.promise(async function (resolve, reject) {
      try {
        const data = helper?.readFile(templatePaths);

        let assetArrays = [data?.InlineContentSummary, data?.CarouselSummary];
        // let assetArrays = [data?.CarouselSummary];

        for (const assetArray of assetArrays) {
          if (assetArray) {
            for (const item of Object.values(assetArray)) {
              await self.getAsset(item);
            }
          }
        }

        resolve();
      } catch (error) {
        console.log(error);
        reject();
      }
    });
  },

  start: function () {
    var self = this;
    successLogger('exporting assets...');
    return new Promise(async function (resolve, reject) {
      try {
        await self.getAllAssets(global.config.aem_folder);

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
      // try {
      //   for (const templatePaths of global.config.aem_folder || []) {
      //     // console.log(templatePaths);
      //     await self.getAllAssets({ templatePaths });
      //   }

      //   resolve();
      // } catch (error) {
      //   console.log(error);
      //   reject(error);
      // }
    });
  },
};

module.exports = ExtractAssets;
