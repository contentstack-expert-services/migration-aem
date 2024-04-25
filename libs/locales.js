const fs = require('fs-extra');
const path = require('path');
var when = require('when');

function ExtractContentTypes() {}

ExtractContentTypes.prototype = {
  start: function () {
    return when.promise(function (resolve, reject) {
      try {
        const sourcePath = path.join(__dirname, './');
        const destinationPath = path.join(process.cwd(), config.data);
        const foldersToCopy = ['locales'];
        foldersToCopy.forEach((folder) => {
          const sourceFolderPath = path.join(sourcePath, folder);
          const destinationFolderPath = path.join(destinationPath, folder);

          try {
            fs.copySync(sourceFolderPath, destinationFolderPath);
            console.log(`Successfully created ${folder}`);
          } catch (err) {
            console.error(`Error copying ${folder}: ${err}`);
          }
        });
        resolve();
      } catch (error) {
        console.log(error);
        reject();
      }
    });
  },
};

module.exports = ExtractContentTypes;
