const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs');
var when = require('when');
const chalk = require('chalk');

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

function convertInputToJSON(input) {
  const output = {
    product_variant_selector: [],
    trackingProductList: '',
    showOOS: false,
    saleOnly: false,
    layout: '',
  };

  if (input) {
    // Extract "Manual Product details" value
    const manualDetailsMatch = input.match(
      /Manual Product details: (.*?) Tracking Product List:/
    );
    if (manualDetailsMatch) {
      output['product_variant_selector'] = manualDetailsMatch[1]
        .split(' ')
        .filter((item) => item.trim() !== '')
        .map((item) => ({ id: item }));
    }

    // Extract "Tracking Product List" value
    const trackingProductListMatch = input.match(
      /Tracking Product List: (.*?) Show OOS:/
    );
    if (trackingProductListMatch) {
      output['trackingProductList'] = trackingProductListMatch[1].trim();
    }

    // Extract "Show OOS" value
    const showOOSMatch = input.match(/Show OOS: (.*?) Sale Only:/);
    if (showOOSMatch) {
      output['showOOS'] = showOOSMatch[1].trim().toLowerCase() === 'true';
    }

    // Extract "Sale Only" value
    const saleOnlyMatch = input.match(/Sale Only: (.*?) Varient:/);
    if (saleOnlyMatch) {
      output['saleOnly'] = saleOnlyMatch[1].trim().toLowerCase() === 'true';
    }

    // Extract "Varient" value
    const varientMatch = input.match(/Varient: (.*)$/);
    if (varientMatch) {
      if (varientMatch[1].trim() === 'row') {
        output['layout'] = 'carousel';
      } else if (varientMatch[1].trim() === 'grid') {
        output['layout'] = 'grid';
      }
    }

    return output;
  }
}

ExtractEntries.prototype = {
  saveEntry: function (entries) {
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
              'product_list'
            );

            if (!fs.existsSync(folderPath)) {
              mkdirp.sync(folderPath);
            }

            const filePath = path.join(folderPath, 'en-us.json');

            let entriesData = readEntriesFile(filePath);

            let uidString = `Product List: ${key} - C: ${value['jcr:created']} M: ${value['jcr:lastModified']}`;
            let uid =
              `${key} - C: ${value['jcr:created']} M: ${value['jcr:lastModified']}`
                .replace(/[^a-zA-Z0-9]/g, '_')
                .replace(/^_+/, '')
                .replace(/_+/g, '_')
                .toLowerCase();

            let title;
            if (value?.trackingProductList) {
              if (value?.trackingProductList.trim()) {
                title = value?.trackingProductList;
              } else {
                title = uidString;
              }
            } else {
              title = uidString;
            }

            if (key.startsWith('productlisting')) {
              entriesData[uid] = {
                uid: uid,
                title: title,
                layout: 'carousel',
                heading: value?.trackingProductList,
                show_sale_only: value?.saleOnly,
                show_oos: value?.showOOS,
                type: value?.type ?? 'manual',
                publish_details: [],
              };
              writeEntriesFile(filePath, entriesData);
            } else if (key.startsWith('experiencefragment')) {
              let efValue = convertInputToJSON(value?.text);
              entriesData[uid] = {
                uid: uid,
                title: title,
                layout: efValue?.layout ?? 'carousel',
                heading: value?.trackingProductList,
                product_variant_selector: efValue?.product_variant_selector,
                show_sale_only: efValue?.saleOnly,
                show_oos: efValue?.showOOS,
                type: value?.type ?? 'manual',
                publish_details: [],
              };
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
    successLogger('exporting product listing...');

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
