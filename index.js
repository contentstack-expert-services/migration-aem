var path = require('path'),
  chalk = require('chalk'),
  fs = require('fs'),
  inquirer = require('inquirer');
const read = require('fs-readdir-recursive');
const aemFile = [];

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

    console.log(chalk.green('\n\nAEM Data exporting has been started\n'));
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
      global.config.sitecore_folder = answer.csFilePath;
      migFunction();
    } catch (error) {
      console.log(chalk.red(error.message));
    }
  });
};

AEMMigration();
// module.exports = migFunction();
