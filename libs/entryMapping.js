const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs');
const read = require('fs-readdir-recursive');
const os = require('os');
const platform = os.platform();

var when = require('when');

const helper = require('../utils/helper');

var entryFolderPath = path.resolve(config.data, config.modules.entries.dirName);

if (!fs.existsSync(entryFolderPath)) {
  mkdirp.sync(entryFolderPath);
}
function ExtractEntryMapping() {}

function readEntriesFile(filePath) {
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  }
  return {};
}

function writeEntriesFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
}

ExtractEntryMapping.prototype = {
  saveEntry: function (entryData, fileName) {
    return when.promise(function (resolve, reject) {
      try {
        const extractedValue = fileName.match(/\/([^/]+)\/[^/]+\.json$/)?.[1];
        const entryFileName = extractedValue?.replace(/-/g, '_').toLowerCase();

        if (!entryFileName) {
          return;
        }
        const folderPath = path.join(
          process.cwd(),
          config.data,
          'entries',
          entryFileName
        );

        if (!fs.existsSync(folderPath)) {
          mkdirp.sync(folderPath);
        }

        const filePath = path.join(folderPath, 'en-us.json');
        let entriesData = readEntriesFile(filePath);
        if (entryData?.['pageProperty_titleTag']) {
          let uid = entryData?.['pageProperty_titleTag']
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/^_+/, '')
            .replace(/_+/g, '_')
            .toLowerCase();

          let mapperJson = entryData?.root?.container?.container;

          const outputMapperJson = {};

          let ignoreContentType = ['spacer', 'container', 'columncontrol'];
          for (const key in mapperJson) {
            if (mapperJson[key]['sling:resourceType']) {
              const contentType = mapperJson[key]['sling:resourceType']
                .split('/')
                .pop();
              if (!ignoreContentType.includes(contentType)) {
                if (!outputMapperJson[contentType]) {
                  outputMapperJson[contentType] = [];
                }

                const createdValue = mapperJson[key]['jcr:created'];
                let uidString = `${key} ${createdValue}`;
                outputMapperJson[contentType].push({
                  uid: uidString
                    .replace(/[^a-zA-Z0-9]/g, '_')
                    .replace(/^_+/, '')
                    .replace(/_+/g, '_')
                    .toLowerCase(),
                  _content_type_uid: contentType,
                });
              }
            }
          }

          entriesData[uid] = {
            uid: uid,
            title: entryData?.['pageProperty_titleTag'],
            url: entryData['sling:vanityPath']
              ? `/${entryData['sling:vanityPath']}`
              : `/${uid}`,
            description: entryData?.['pageProperty_description'],
            ...outputMapperJson,
          };

          if (entriesData[uid]?.title && entriesData[uid]?.title == '&nbsp;') {
            entriesData[uid].title = uid;
          }

          writeEntriesFile(filePath, entriesData);
        }

        resolve();
      } catch (error) {
        console.log('error', error);
        reject();
      }
    });
  },

  getAllEntries: function ({ templatePaths }) {
    var self = this;

    return when
      .promise(function (resolve, reject) {
        //for reading json file and store in alldata
        const alldata = helper?.readFile(templatePaths);

        // console.log(`${global.config.sitecore_folder}/${templatePaths}`);
        // to fetch all the entries from the json output
        // var entries = alldata["jcr:content"]?.root?.container?.container;

        var entries = alldata['jcr:content'];

        if (entries) {
          //run to save and excrete the entries
          self.saveEntry(
            entries,
            `${global.config.sitecore_folder}/${templatePaths}`
          );

          resolve();
        } else {
          console.log(chalk.red(`no entries found`));
          resolve();
        }
      })
      .catch(function (e) {
        console.log(e);
      });
  },

  start: function (aemFile) {
    var self = this;
    successLogger('Mapping entries...');

    return when.promise(function (resolve, reject) {
      if (platform === 'win32') {
        aemFile = aemFile.map((item) => item.replace(/\\/g, '/'));
      }
      for (let i = 0; i < aemFile?.length; i++) {
        self.getAllEntries({
          templatePaths: aemFile?.[i],
        });
      }
      resolve();
    });
  },
};

module.exports = ExtractEntryMapping;
