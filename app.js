var path = require('path'),
  chalk = require('chalk'),
  fs = require('fs'),
  inquirer = require('inquirer');
const read = require('fs-readdir-recursive');
const aemFile = [];

_ = require('lodash');
const Messages = require('./utils/message');
const messages = new Messages('wordpress').msgs;

config = require('./config');
global.errorLogger = require('./utils/logger')('error').error;
global.successLogger = require('./utils/logger')('success').log;
global.warnLogger = require('./utils/logger')('warn').log;

var modulesList = [
  'assets',
  'content_types',
  'labels',
  'entries',
  'entryMapping',
]; //to create entries
var _export = [];

var promises = [];

const schemaMaker = () => {
  if (
    fs.existsSync(
      path.join(process.cwd(), config.data, 'content_types', 'schema.json')
    )
  ) {
    // to copy json data from all the content type and meke a schema.json
    fs.readdir(
      path.join(process.cwd(), config.data, 'content_types'),
      (err, fileNames) => {
        if (err) throw console.log(err.message);
        // Loop fileNames array
        fileNames.forEach((filename) => {
          // Read file content
          fs.readFile(
            path.join(
              process.cwd(),
              config.data,
              'content_types',
              `${filename}`
            ),
            (err, data) => {
              if (err) throw console.log(err.message);
              // Log file content
              const output = JSON.parse(data);
              arr.push(output);

              fs.writeFileSync(
                path.join(
                  process.cwd(),
                  config.data,
                  'content_types',
                  `schema.json`
                ),
                JSON.stringify(arr, null, 4),
                (err) => {
                  if (err) throw console.log(err.message);
                }
              );
            }
          );
        });
      }
    );
  }
};

const migFunction = async () => {
  try {
    // global.config.sitecore_folder =
    //   "/Users/saurav.upadhyay/Expert Service/Team Fury/Backcountry/Backcountry Corp CMS/DAM/us/en/explore-blog";
    // global.config.sitecore_folder =
    //   "/Users/saurav.upadhyay/Expert Service/Team Fury/Backcountry";
    global.filePath = undefined;
    let files = read(global.config.sitecore_folder);
    for (const filePath of files) {
      if (path.extname(filePath) === '.json') {
        const fullpath = path.join(global.config.sitecore_folder, filePath);
        aemFile.push(fullpath);
      }
    }

    // Module List for Entries
    for (let i = 0; i < modulesList.length; i++) {
      const ModuleExport = require(`./libs/${modulesList[i]}.js`);
      const moduleExport = new ModuleExport();
      await moduleExport.start(aemFile);

      // Introduce a 5-second delay between module executions
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // Wait for all module promises to complete
    // await Promise.all(modulePromises);

    console.log(chalk.green('\n\nAEM Data exporting has been started\n'));
    const arr = [];
  } catch (error) {
    console.log(error);
  }
};

module.exports = AEMMigration = async () => {
  const question = [
    {
      type: 'input',
      name: 'csFilePath',
      message: messages.promptFilePath,
      validate: (csFilePath) => {
        if (!csFilePath || csFilePath.trim() === '') {
          console.log(chalk.red('Please insert filepath!'));
          return false;
        }
        this.name = csFilePath;
        return true;
      },
    },
  ];
  inquirer.prompt(question).then(async (answer) => {
    try {
      global.config.sitecore_folder = answer.csFilePath;
      migFunction();
    } catch (error) {
      console.log(chalk.red(error.message));
    }
  });
};

// module.exports = migFunction();
