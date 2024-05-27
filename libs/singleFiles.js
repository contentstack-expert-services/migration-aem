const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs');
const when = require('when');
const chalk = require('chalk');
const helper = require('../utils/helper');

const {
  textbanner,
  text,
  anchornavigation,
  image,
  carousel,
  button,
  teaser,
  productlist,
  accordion,
} = require('./entrySchema');

const pathMappings = {
  '/campaign/': 'campaign',
  '/explore-blog/': 'blog',
  '/info/': 'info',
};

const entryFolderPath = path.resolve(
  config.data,
  config.modules.entries.dirName
);

function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    mkdirp.sync(directory);
  }
}

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

function getFilePath(templatePath) {
  for (const [key, dirName] of Object.entries(pathMappings)) {
    if (templatePath.includes(key)) {
      const directory = path.join(entryFolderPath, dirName);
      ensureDirectoryExists(directory);
      return path.join(directory, 'en-us.json');
    }
  }
  throw new Error(
    `Template path does not match any known directories: ${templatePath}`
  );
}

function ExtractEntries() {}

ExtractEntries.prototype = {
  saveEntry: function (entries, templatePath) {
    return new Promise((resolve, reject) => {
      try {
        const components = [];
        const entry =
          entries?.root?.container?.container ?? entries?.root?.container;

        for (const [key, value] of Object.entries(entry)) {
          let ignoreContentType = [
            'spacer',
            'container',
            'columncontrol',
            'jcr:primaryType',
            'layout',
            'sling:resourceType',
            'experiencefragment',
            'jcr:lastModifiedBy',
            'customembed',
            'alignment',
            'jcr:lastModified',
          ];
          if (!ignoreContentType.includes(key.split(/_(.*)/s)[0])) {
            switch (true) {
              case key.startsWith('textbanner'):
                components.push(textbanner(value, key));
                break;
              case /^(text_|text)(?!banner)/.test(key):
                components.push(text(value, key));
                break;
              case key.startsWith('anchornavigation'):
                components.push(anchornavigation(value, key));
                break;
              case key.startsWith('image'):
                components.push(image(value, key));
                break;
              case key.startsWith('teaser'):
                components.push(teaser(value, key));
                break;
              case key.startsWith('button'):
                components.push(button(value, key));
                break;
              case key.startsWith('carousel'):
                components.push(carousel(value, key));
                break;
              case key.startsWith('productlisting'):
                components.push(productlist(value, key));
                break;
              default:
                console.log(key);
                break;
            }
          }
        }

        const filePath = getFilePath(templatePath);
        let entriesData = readEntriesFile(filePath);

        // to create uid
        let uidString = entries['jcr:uuid'] + entries['jcr:title'];
        let uid = uidString
          .replace(/[^a-zA-Z0-9]/g, '_')
          .replace(/^_+/, '')
          .replace(/_+/g, '_')
          .toLowerCase();

        // to create tag for page
        // let pageTag = [];
        // if (entries['pageProperty_titleTag']) {
        //   pageTag = entries['pageProperty_titleTag']
        //     .split(/[,|]/)
        //     .map((tag) => tag.trim());
        // }

        let title;
        if (entries['jcr:title']) {
          if (entries['jcr:title'].trim()) {
            title = `${entries['jcr:title']} - ${entries['jcr:created']}`;
          } else {
            title = uidString;
          }
        } else {
          title = uidString;
        }

        entriesData[uid] = {
          uid: uid,
          title: title,
          url: entries['sling:vanityPath'],
          page_content: { components: [...components] },
          seo: {
            title: entries['pageProperty_titleTag'],
            index_follow: true,
            description: entries['pageProperty_description'],
          },
          //   tags: pageTag,
          publish_details: [],
        };

        writeEntriesFile(filePath, entriesData);
        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  },

  getAllEntries: function ({ templatePaths }) {
    return when.promise((resolve, reject) => {
      try {
        const alldata = helper.readFile(templatePaths);
        const entries = alldata['jcr:content'];

        if (entries) {
          this.saveEntry(entries, templatePaths)
            .then(() => resolve())
            .catch((error) => reject(error));
        } else {
          console.log(chalk.red('No entries found'));
          resolve();
        }
      } catch (error) {
        console.error(error);
        reject(error);
      }
    });
  },

  start: function (aemFile) {
    successLogger('exporting entries...');

    return when.promise((resolve, reject) => {
      const promises = aemFile.map((file) =>
        this.getAllEntries({ templatePaths: file })
      );
      Promise.all(promises)
        .then(() => resolve())
        .catch((error) => reject(error));
    });
  },
};

module.exports = ExtractEntries;
