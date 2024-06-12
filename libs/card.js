const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs');
var when = require('when');
const chalk = require('chalk');
const { JSDOM } = require('jsdom');
const { htmlToJson } = require('@contentstack/json-rte-serializer');
const querystring = require('querystring');
const cheerio = require('cheerio');

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
      metadata: {
        alt: entry?.alt,
        caption: entry?.alt,
      },
    };

    if (entry?.fileReference) {
      const fileReferenceDetails = getAssetsDetails(entry.fileReference);
      if (fileReferenceDetails) {
        backgroundImage.image = fileReferenceDetails;
      }
    }
    if (entry?.videoAsset) {
      const fileReferenceDetails = getAssetsDetails(entry.videoAsset);
      if (fileReferenceDetails) {
        backgroundImage.video = fileReferenceDetails;
      }
    }

    entryData[entryId]['media'] = backgroundImage;
  } catch (error) {
    console.error('Error reading assets file:', error);
  }
}

const processEntry = async (key, value, entriesData, filePath) => {
  let checkArray = ['carousel', 'teaser', 'image'];

  let isMatch = checkArray.some((val) => key.includes(val));
  if (isMatch) {
    const uidString = `Card: ${key} - ${value['jcr:created']}`;
    const uid = `${key} - ${value['jcr:created']}`
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^_+/, '')
      .replace(/_+/g, '_')
      .toLowerCase();

    let description;
    if (value?.['jcr:description']) {
      description = querystring.unescape(value?.['jcr:description']);
    }

    const $ = cheerio.load(description ?? '<p></p>');

    // Set to store unique tag names
    const tagSet = new Set();

    const dom = new JSDOM(
      description
        ?.replace(/\\"/g, '"')
        .replace(/\r\n/g, '<br>')
        .replace(/\t/g, '')
    );

    let htmlDoc = dom.window.document.querySelector('body');

    // Traverse through all elements and add their tag names to the set
    $('body *').each((index, element) => {
      tagSet.add(element.tagName);
    });

    // Convert the set to an array
    const tagList = Array.from(tagSet);

    // Object to store all customElementTags definitions
    let customElementTags = {};

    // Loop through the tag list and add definitions to customElementTags
    for (const tag of tagList) {
      customElementTags[tag.toUpperCase()] = (el) => {
        let jsonObject = {
          type: tag,
          attrs: {},
        };

        const classAttribute = el.getAttribute('class');
        if (classAttribute) {
          jsonObject.textstyle = classAttribute;
        }

        return jsonObject;
      };
    }

    // Convert HTML to JSON using the customElementTags
    const jsonValue = htmlToJson(htmlDoc, {
      customElementTags: customElementTags,
    });

    let actionArray = [];
    if (key.startsWith('teaser') && value?.actions) {
      actionArray = Object.keys(value.actions)
        .filter((key) => key.startsWith('item'))
        .map((key) => ({
          link: {
            title: value.actions[key]?.text ?? '',
            href: value.actions[key]?.link ?? '',
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

    let alignment;
    if (value?.alignment === 'left') {
      alignment = 'flex-start';
    } else if (value?.alignment === 'center') {
      alignment = 'center';
    } else {
      alignment = 'flex-start';
    }

    let bgValue;
    if (value?.backgroundColor === 'black') {
      bgValue = 'bg.primary';
    } else if (value?.backgroundColor === 'white') {
      bgValue = 'bg.inverted';
    } else {
      bgValue = 'bg.primary';
    }

    // Initialize the entry data
    const entryData = {
      uid: uid,
      title: uidString,
      content: {
        alignment: alignment ?? 'flex-start',
        background_color: { value: bgValue ?? 'bg.primary' },
        ctas: actionArray,
      },
      tracking: {
        name: value?.promotionName ?? '',
        promo_id: value?.promotionId ?? '',
      },
      publish_details: [],
    };

    // Conditionally add the texts array to the content key if jsonValue is not empty
    if (jsonValue && Object.keys(jsonValue).length > 0) {
      entryData.content.texts = jsonValue;
    }

    entriesData[uid] = entryData;

    imageMapping(uid, value, entriesData);
    writeEntriesFile(filePath, entriesData);
  }
};

ExtractEntries.prototype = {
  saveEntry: function (entries) {
    return new Promise(async function (resolve, reject) {
      const promises = [];

      for (const [key, value] of Object.entries(entries)) {
        let ignoreContentType = ['spacer', 'container', 'columncontrol'];
        if (
          value['jcr:created'] &&
          !ignoreContentType.includes(key.split(/_(.*)/s)[0])
        ) {
          const folderPath = path.join(
            process.cwd(),
            config.data,
            'entries',
            'card'
          );

          if (!fs.existsSync(folderPath)) {
            mkdirp.sync(folderPath);
          }

          const filePath = path.join(folderPath, 'en-us.json');
          let entriesData = readEntriesFile(filePath);

          if (key.startsWith('carousel')) {
            for (const [teaserKey, teaserValue] of Object.entries(value)) {
              if (typeof teaserValue === 'object') {
                promises.push(
                  processEntry(teaserKey, teaserValue, entriesData, filePath)
                );
              }
            }
          } else {
            promises.push(processEntry(key, value, entriesData, filePath));
          }
        }
      }

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
    successLogger('exporting cards...');

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
