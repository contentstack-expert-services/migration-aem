var path = require('path'),
  chalk = require('chalk'),
  fs = require('fs'),
  inquirer = require('inquirer');
const read = require('fs-readdir-recursive');
const aemFile = [];

const Messages = require('./utils/message');
const messages = new Messages('wordpress').msgs;
const cliUpdate = require('./utils/cli_convert');

config = require('./config');
global.errorLogger = require('./utils/logger')('error').error;
global.successLogger = require('./utils/logger')('success').log;
global.warnLogger = require('./utils/logger')('warn').log;

var modulesList = [
  'assets',
  // 'entry',
  // 'folders',
  // 'card',
  // 'productlisting',
  // 'textbanner',
  // 'singleFiles',
]; //to create entries

const migFunction = async () => {
  try {
    global.filePath = undefined;

    global.config.aem_folder =
      '/Users/saurav.upadhyay/Expert Service/Team Fury/migration-aem - express/sample.json';

    // let files = read(global.config.aem_folder);
    // for (const filePath of files) {
    //   if (path.extname(filePath) === '.json') {
    //     const fullpath = path.join(global.config.aem_folder, filePath);
    //     aemFile.push(fullpath);
    //   }
    // }
    // Module List for Entries
    for (let i = 0; i < modulesList.length; i++) {
      const ModuleExport = require(`./libs/${modulesList[i]}.js`);
      const moduleExport = new ModuleExport();
      await moduleExport.start();
      // Introduce a 5-second delay between module executions
      await new Promise((resolve) => setTimeout(resolve, 20000));
    }
    // await cliUpdate();

    console.log(chalk.green('\n\nAEM Data exporting has been started\n'));

    // to convert data to support CLI support
  } catch (error) {
    console.log(error);
  }
};

const AEMMigration = async () => {
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
      global.config.aem_folder = answer.csFilePath;
      migFunction();
    } catch (error) {
      console.log(chalk.red(error.message));
    }
  });
};

// AEMMigration();
module.exports = migFunction();
