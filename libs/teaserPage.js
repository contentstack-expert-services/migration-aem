const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs-extra');

var entryFolderPath = path.resolve(config.data, config.modules.entries.dirName);

if (!fs.existsSync(entryFolderPath)) {
  mkdirp.sync(entryFolderPath);
}

function ExtractEntries() {}

ExtractEntries.prototype = {
  start: function () {
    const sourcePath = path.join(__dirname, './');
    const foldersToCopy = ['teaser'];
    foldersToCopy.forEach((folder) => {
      const sourceFolderPath = path.join(sourcePath, folder);
      const destinationFolderPath = path.join(entryFolderPath, folder, 'en-us');

      try {
        fs.copySync(sourceFolderPath, destinationFolderPath);
        console.log(`Successfully created ${folder}`);
      } catch (err) {
        console.error(`Error copying ${folder}: ${err}`);
      }
    });
  },
};

module.exports = ExtractEntries;
