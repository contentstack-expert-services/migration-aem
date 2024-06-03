const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs');
var when = require('when');
const chalk = require('chalk');
const { JSDOM } = require('jsdom');
const { htmlToJson } = require('@contentstack/json-rte-serializer');
const querystring = require('querystring');

const helper = require('../utils/helper');

var entryFolderPath = path.resolve(config.data, config.modules.entries.dirName);
if (!fs.existsSync(entryFolderPath)) {
  mkdirp.sync(entryFolderPath);
}

function ExtractEntries() {}

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

function imageMapping(entryId, entry, entryData) {
  try {
    var assetsId = helper.readFile(
      path.join(process.cwd(), config.data, 'assets', 'assets.json')
    );

    const getAssetsDetails = (entryField) => {
      if (entryField) {
        const attachmentId = entryField
          .replace(/[^a-zA-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .toLowerCase();

        const asset = Object.values(assetsId).find(
          (asset) => asset.uid === attachmentId
        );

        return asset || null;
      }
      return null;
    };

    let backgroundImage = {
      repeat: false,
    };

    if (entry?.fileReference) {
      const fileReferenceDetails = getAssetsDetails(entry.fileReference);
      if (fileReferenceDetails) {
        backgroundImage.image = fileReferenceDetails;
      }
    }

    entryData[entryId]['background_image'] = backgroundImage;
  } catch (error) {
    console.error('Error reading assets file:', error);
    reject(error);
  }
}

ExtractEntries.prototype = {
  saveEntry: function (entries) {
    var self = this;

    return new Promise(async function (resolve, reject) {
      const promises = [];

      for (const [key, value] of Object.entries(entries)) {
        let ignoreContentType = ['spacer', 'container', 'columncontrol'];
        if (value['jcr:created']) {
          if (!ignoreContentType.includes(key.split(/_(.*)/s)[0])) {
            const folderPath = path.join(
              process.cwd(),
              config.data,
              'entries',
              'text_banner'
            );

            if (!fs.existsSync(folderPath)) {
              mkdirp.sync(folderPath);
            }

            const filePath = path.join(folderPath, 'en-us.json');

            let entriesData = readEntriesFile(filePath);

            let uidString = `${key} - ${value['jcr:created']}`;
            let uid = uidString
              .replace(/[^a-zA-Z0-9]/g, '_')
              .replace(/^_+/, '')
              .replace(/_+/g, '_')
              .toLowerCase();

            let actionArray = [];

            if (key.startsWith('textbanner')) {
              if (value?.actions) {
                actionArray = Object.keys(value?.actions)
                  .filter((key) => key.startsWith('item')) // Filter out non-item keys
                  .map((key) => ({
                    link: {
                      title: value?.actions[key]?.text,
                      href: value?.actions[key]?.link,
                    },
                    style: value.actions[key]?.variation ?? 'solid',
                    _metadata: {
                      uid: `${Math.floor(Math.random() * 100000000000000)}`,
                    },
                  }));
              } else {
                actionArray = [
                  {
                    link: {
                      title: '',
                      href: '',
                    },
                    style: 'solid',
                    _metadata: {
                      uid: `${Math.floor(Math.random() * 100000000000000)}`,
                    },
                  },
                ];
              }

              let jsonValue;
              let description;
              if (value?.['jcr:description']) {
                description = querystring.unescape(value?.['jcr:description']);
              }

              const dom = new JSDOM(description);
              let htmlDoc = dom.window.document.querySelector('body');
              jsonValue = htmlToJson(htmlDoc);

              // Initialize the entry data
              const entryData = {
                uid: uid,
                title: uidString,
                ctas: actionArray,
                tracking: {
                  promo_id: value?.promotionId ?? '',
                  name: value?.promotionName ?? '',
                },
                background_color: {
                  hsl: {
                    h: 250.00000000000003,
                    s: 0,
                    l: 1,
                    a: 1,
                  },
                  hex: '#ffffff',
                  rgb: {
                    r: 255,
                    g: 255,
                    b: 255,
                    a: 1,
                  },
                  hsv: {
                    h: 250.00000000000003,
                    s: 0,
                    v: 1,
                    a: 1,
                  },
                  oldHue: 250.00000000000003,
                  source: 'hsv',
                },
                publish_details: [],
              };

              // Conditionally add the content key with texts array if jsonValue is not empty
              if (jsonValue && Object.keys(jsonValue).length > 0) {
                entryData.content = { texts: [jsonValue] };
              }

              entriesData[uid] = entryData;

              imageMapping(uid, value, entriesData);
              writeEntriesFile(filePath, entriesData);
            }

            promises.push(Promise.resolve());
          }
        }
      }

      // Resolve the main promise when all promises in the array are resolved
      Promise.all(promises)
        .then(() => {
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  getAllEntries: function ({ templatePaths }) {
    var self = this;

    return when
      .promise(function (resolve, reject) {
        //for reading json file and store in alldata
        const alldata = helper?.readFile(templatePaths);
        // to fetch all the entries from the json output
        var entries =
          alldata['jcr:content']?.root?.container?.container ??
          alldata['jcr:content']?.root?.container;

        if (entries) {
          //run to save and excrete the entries
          self.saveEntry(entries);

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
    successLogger('exporting text_banner...');

    return when.promise(function (resolve, reject) {
      for (let i = 0; i < aemFile?.length; i++) {
        self.getAllEntries({
          templatePaths: aemFile?.[i],
        });
      }
      resolve();
    });
  },
};
module.exports = ExtractEntries;
