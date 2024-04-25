const fs = require('fs-extra');
const path = require('path');
const when = require('when');
const mkdirp = require('mkdirp');
const read = require('fs-readdir-recursive');

const helper = require('../utils/helper');

var labelConfig = config.modules.labels;
var labelFolderPath = path.resolve(config.data, labelConfig.dirName);

if (!fs.existsSync(labelFolderPath)) {
  mkdirp.sync(labelFolderPath);
  helper.writeFile(path.join(labelFolderPath, labelConfig.fileName));
} else {
  helper.writeFile(path.join(labelFolderPath, labelConfig.fileName));
}

var labelData = helper.readFile(
  path.join(path.join(labelFolderPath, 'labels.json'))
);

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

function ExtractContentTypes() {}

ExtractContentTypes.prototype = {
  saveLabel: function (labels) {
    var self = this;
    return new Promise(async function (resolve, reject) {
      try {
        const labelArray = labels.split('/');

        let aemComponent = {
          aem_component_labels_123: {
            uid: 'aem_component_labels_123',
            name: 'AEM Components',
            parent: [],
            ACL: [],
            _version: 1,
            content_types: [
              'accordion',
              'anchornavigation',
              'button',
              'carousel',
              'customembed',
              'experiencefragment',
              'image',
              'teaser',
              'text',
              'textbanner',
            ],
          },
        };

        for (let i = 0; i < labelArray.length; i++) {
          const currentLabel = labelArray[i].replace(/-/g, '_').toLowerCase();
          const previousLabel = i > 0 ? labelArray[i - 1] : null;
          const uid = `${currentLabel}_labels_123`;

          labelData[uid] = {
            uid: uid,
            name: currentLabel,
            parent: previousLabel
              ? [`${previousLabel.replace(/-/g, '_').toLowerCase()}_labels_123`]
              : [],
            ACL: [],
            _version: 1,
            content_types: [currentLabel],
          };
        }

        labelData[aemComponent['aem_component_labels_123'].uid] =
          aemComponent['aem_component_labels_123'];
        // console.log(filePath, "\n", labelData);
        helper.writeFile(
          path.join(process.cwd(), config.data, 'labels', 'labels'),
          JSON.stringify(labelData, null, 4)
        );

        // writeEntriesFile(filePath, result);

        resolve();
      } catch (error) {
        console.log(error);
        reject();
      }
    });
  },

  getAllLabels: function ({ templatePaths }) {
    var self = this;
    return when.promise(function (resolve, reject) {
      try {
        const localeArray = ['en'];

        // Create a regular expression pattern based on the array values, ensuring it's between slashes
        const regexPattern = new RegExp(
          `\\/(?:${localeArray.join('|')})\\/(.*)`
        );

        // Check if the array value is present in the input string
        const match = templatePaths.match(regexPattern);

        let labels;

        if (match) {
          // Get the part after the matched array value
          const splitString = match[1];

          // Check if the split string ends with a file extension
          if (splitString.endsWith('.json')) {
            // Split the string again to get the final result
            labels = splitString.split('/').slice(0, -1).join('/');
          } else {
            labels = splitString;
          }
        } else {
          // If no array value is found, check the second condition
          if (templatePaths.endsWith('.json')) {
            labels = templatePaths.split('/').slice(0, -1).join('/');
          }
        }

        if (labels) {
          self.saveLabel(labels);
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
    successLogger('exporting Labels...');

    return when.promise(function (resolve, reject) {
      const folder = read(global.config.sitecore_folder);
      // console.log(folder);
      for (let i = 0; i < folder?.length; i++) {
        self.getAllLabels({
          templatePaths: folder?.[i],
        });
      }
      resolve();
    });
  },
};

module.exports = ExtractContentTypes;
