const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs');
const read = require('fs-readdir-recursive');
var when = require('when');
const chalk = require('chalk');
const { JSDOM } = require('jsdom');
const { htmlToJson } = require('@contentstack/json-rte-serializer');
const cheerio = require('cheerio');
const axios = require('axios');

const helper = require('../utils/helper');

var entryFolderPath = path.resolve(config.data, config.modules.entries.dirName);

if (!fs.existsSync(entryFolderPath)) {
  mkdirp.sync(entryFolderPath);
}
function ExtractEntries() {}

async function getYoutubeDetails(url) {
  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);
    const title = $('meta[name="title"]').attr('content');
    if (title) {
      return title;
    } else {
      throw new Error('Unable to retrieve video details.');
    }
  } catch (error) {
    console.log(`Can't fetch title of this url: ${url}`);
  }
}

function extractContent(input) {
  // Check if the input contains HTML tags
  const hasHTMLTags = /<[^>]+>/i.test(input);

  if (hasHTMLTags) {
    // Extract content from the first HTML tag
    const match = input.match(/<[^>]+>([^<]*)<\/[^>]+>/);
    return match ? match[1].trim() : '';
  } else {
    // Extract the first sentence before the full stop
    const match = input.match(/^[^\.]+/);
    return match ? match[0].trim() : '';
  }
}

const processTeaser = async (key, value, entriesData, filePath) => {
  // console.log("here", filePath);
  filePath = filePath.replace(/carousel(?![^\/]*carousel)/, 'teaser');
  if (key.startsWith('teaser')) {
    let uidString = `${key} ${value['jcr:created']}`;
    let uid = uidString
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^_+/, '')
      .replace(/_+/g, '_')
      .toLowerCase();
    if (uid !== undefined) {
      let actionArray = [];

      if (value?.actions) {
        actionArray = Object.keys(value?.actions)
          .filter((key) => key.startsWith('item')) // Filter out non-item keys
          .map((key) => ({
            title: value?.actions[key].text,
            href: value?.actions[key].link,
          }));
      }

      const dom = new JSDOM(value?.['jcr:description'] ?? '');
      let htmlDoc = dom.window.document.querySelector('body');
      const jsonValue = htmlToJson(htmlDoc);

      entriesData[uid] = {
        uid: uid,
        title: extractContent(value?.['jcr:description'] ?? ''),
        url: value?.linkURL ?? '',
        description: jsonValue,
        action: actionArray,
      };

      await imageMapping(uid, value, entriesData);
    }
    const carouselEntries = {};
    const teaserEntries = {};

    // Iterate over the entriesData and categorize based on key
    for (const [key, value] of Object.entries(entriesData)) {
      if (key.startsWith('carousel')) {
        carouselEntries[key] = value;
      } else if (key.startsWith('teaser')) {
        teaserEntries[key] = value;
      }
    }

    // Write entries to respective files
    const carouselFilePath = path.join(
      process.cwd(),
      config.data,
      'entries',
      'carousel',
      'en-us.json'
    );
    writeEntriesFile(carouselFilePath, carouselEntries);

    const teaserFilePath = path.join(
      process.cwd(),
      config.data,
      'entries',
      'teaser',
      'en-us.json'
    );
    writeEntriesFile(teaserFilePath, teaserEntries);
  }
};

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

async function imageMapping(entryId, entry, entryData) {
  return new Promise(async (resolve, reject) => {
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
          return (
            Object.values(assetsId).find(
              (asset) => asset.uid === attachmentId
            ) || null
          );
        }
        return null;
      };

      if (entry?.fileReference) {
        const fileReferenceDetails = getAssetsDetails(entry.fileReference);
        if (fileReferenceDetails) {
          entryData[entryId]['file_reference'] = [fileReferenceDetails];
        }
      } else if (entry?.videoAsset) {
        const videoAssetDetails = getAssetsDetails(entry.videoAsset);
        if (videoAssetDetails) {
          entryData[entryId]['video_asset'] = [videoAssetDetails];
        }
      }
      resolve();
    } catch (error) {
      console.error('Error reading assets file:', error);
      reject(error);
    }
  });
}

ExtractEntries.prototype = {
  saveEntry: function (entries) {
    var self = this;

    return new Promise(async function (resolve, reject) {
      const promises = [];

      for (const [key, value] of Object.entries(entries)) {
        if (value['jcr:created']) {
          const folderPath = path.join(
            process.cwd(),
            config.data,
            'entries',
            key.split(/_(.*)/s)[0]
          );

          if (!fs.existsSync(folderPath)) {
            mkdirp.sync(folderPath);
          }

          const filePath = path.join(folderPath, 'en-us.json');
          let entriesData = readEntriesFile(filePath);

          let uidString = `${key} ${value['jcr:created']}`;
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
                  title: value?.actions[key].text,
                  href: value?.actions[key].link,
                }));
            }
            let jsonValue;
            if (value?.['jcr:description']) {
              const dom = new JSDOM(
                value?.['jcr:description']
                  .replace(/<!--.*?-->/g, '')
                  .replace(/&lt;!--?\s+\/?wp:.*?--&gt;/g, '')
              );
              let htmlDoc = dom.window.document.querySelector('body');
              jsonValue = htmlToJson(htmlDoc);
            }

            entriesData[uid] = {
              uid: uid,
              title: extractContent(value?.['jcr:description'] ?? ''),
              description: jsonValue || null,
              action: actionArray,
            };
            if (
              entriesData[uid]?.title &&
              entriesData[uid]?.title == '&nbsp;'
            ) {
              entriesData[uid].title = uid;
            }
            await imageMapping(uid, value, entriesData);
            writeEntriesFile(filePath, entriesData);
          } else if (key.startsWith('text') && uid !== undefined) {
            if (value?.text !== undefined) {
              const dom = new JSDOM(
                value?.text
                  .replace(/<!--.*?-->/g, '')
                  .replace(/&lt;!--?\s+\/?wp:.*?--&gt;/g, '')
              );
              let htmlDoc = dom.window.document.querySelector('body');
              const jsonValue = htmlToJson(htmlDoc);
              entriesData[uid] = {
                uid: uid,
                title: extractContent(value?.text ?? ''),
                text: jsonValue,
              };
            }
            if (
              entriesData[uid]?.title ||
              entriesData[uid]?.title === '&nbsp;' ||
              entriesData[uid]?.title === ''
            ) {
              entriesData[uid].title = uid;
            }
            writeEntriesFile(filePath, entriesData);
          } else if (key.startsWith('anchornavigation')) {
            const outputArray = [];
            for (let keyValue in value?.actions) {
              if (keyValue.startsWith('item')) {
                let item = value?.actions[keyValue];
                let newItem = {
                  link: item.link,
                  text: item.text,
                };
                outputArray.push(newItem);
              }
            }
            entriesData[uid] = {
              uid: uid,
              title: '',
              item: outputArray,
            };
          } else if (key.startsWith('image') && uid !== undefined) {
            entriesData[uid] = {
              uid: uid,
              title: value.alt,
            };
            await imageMapping(uid, value, entriesData);
            writeEntriesFile(filePath, entriesData);
          } else if (key.startsWith('teaser') && uid !== undefined) {
            if (value?.actions) {
              actionArray = Object.keys(value?.actions)
                .filter((key) => key.startsWith('item')) // Filter out non-item keys
                .map((key) => ({
                  title: value?.actions[key].text,
                  href: value?.actions[key].link,
                }));
            }

            const dom = new JSDOM(value?.['jcr:description'] ?? '');
            let htmlDoc = dom.window.document.querySelector('body');
            const jsonValue = htmlToJson(htmlDoc);

            entriesData[uid] = {
              uid: uid,
              title: extractContent(value?.['jcr:description'] ?? ''),
              url: value?.linkURL ?? '',
              description: jsonValue,
              action: actionArray,
            };
            await imageMapping(uid, value, entriesData);
            writeEntriesFile(filePath, entriesData);
          } else if (key.startsWith('button') && uid !== undefined) {
            if (value?.['jcr:title']) {
              entriesData[uid] = {
                uid: uid,
                title: value?.['jcr:title'],
              };
            }
            writeEntriesFile(filePath, entriesData);
          } else if (key.startsWith('customembed') && uid !== undefined) {
            let youtubeVideoUrl;
            if (value?.youtubeVideoId?.startsWith('www.youtube.com')) {
              youtubeVideoUrl = `https://${value?.youtubeVideoId}`;
            } else if (
              value?.youtubeVideoId?.startsWith('https://www.youtube.com')
            ) {
              youtubeVideoUrl = value?.youtubeVideoId;
            } else {
              youtubeVideoUrl = `https://www.youtube.com/watch?v=${value?.youtubeVideoId}`;
            }

            const youtubeTitle = await getYoutubeDetails(youtubeVideoUrl);
            let youtubeJsonUrl = `<iframe src=\"${youtubeVideoUrl}" data-type=\"social-embeds\"></iframe>`;
            const dom = new JSDOM(youtubeJsonUrl, '');
            let htmlDoc = dom.window.document.querySelector('body');
            const jsonValue = htmlToJson(htmlDoc);
            entriesData[uid] = {
              uid: uid,
              title: youtubeTitle ?? youtubeVideoUrl,
              youtubevideoid: jsonValue,
            };
            writeEntriesFile(filePath, entriesData);
          } else if (key.startsWith('carousel')) {
            const teaserMapping = {
              teaser: Object.keys(value)
                .filter((key) => key.startsWith('teaser'))
                .map((teaserKey) => {
                  const teaser = value[teaserKey];
                  let uidString = `${teaserKey} ${teaser['jcr:created']}`;
                  return {
                    uid: uidString
                      .replace(/[^a-zA-Z0-9]/g, '_')
                      .replace(/^_+/, '')
                      .replace(/_+/g, '_')
                      .toLowerCase(),
                    _content_type_uid: 'teaser',
                  };
                }),
            };

            entriesData[uid] = {
              uid: uid,
              ...teaserMapping,
            };

            let teaserPath = path.join(
              process.cwd(),
              config.data,
              'entries',
              'teaser',
              'en-us.json'
            );
            for (const teaserKey in value) {
              // Check if the key is a teaser (starts with "teaser")
              if (teaserKey.startsWith('teaser')) {
                const teaser = value[teaserKey];

                // Process each teaser and save it in the teaser file
                await processTeaser(teaserKey, teaser, entriesData, teaserPath);
              }
            }
          } else if (key.startsWith('accordion')) {
            const outputArray = [];

            for (const keyValue in value) {
              if (value.hasOwnProperty(keyValue)) {
                const item = value[keyValue];
                const panelTitle = item['cq:panelTitle'] || '';
                const title = item['jcr:title'] || '';
                const text = item.text ? item.text.text || '' : '';

                if (panelTitle !== '' && text !== '') {
                  const dom = new JSDOM(text);
                  let htmlDoc = dom.window.document.querySelector('body');
                  const jsonValue = htmlToJson(htmlDoc);
                  const outputItem = {
                    panel_title: panelTitle,
                    title: title,
                    text: jsonValue,
                  };

                  outputArray.push(outputItem);
                }
              }
            }
            entriesData[uid] = {
              uid: uid,
              title: '',
              item: outputArray,
            };
            writeEntriesFile(filePath, entriesData);
          }

          promises.push(Promise.resolve());
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
    successLogger('exporting entries...');

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
