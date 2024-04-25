const mkdirp = require('mkdirp'),
  path = require('path'),
  fs = require('fs'),
  when = require('when'),
  config = require('../config/index.json');

const read = require('fs-readdir-recursive');
const helper = require('../utils/helper');

const reference = {
  data_type: 'reference',
  display_name: '',
  reference_to: [''],
  field_metadata: {
    ref_multiple: false,
    ref_multiple_content_types: true,
  },
  uid: '',
  mandatory: false,
  multiple: true,
  non_localizable: false,
  unique: false,
};

var contentTypeConfig = config.modules.contentTypes,
  contentTypeFolderPath = path.resolve(config.data, contentTypeConfig.dirName);

if (!fs.existsSync(contentTypeFolderPath)) {
  mkdirp.sync(contentTypeFolderPath);
  // helper.writeFile(path.join(contentTypeFolderPath, 'schema'));
}

function ExtractContentTypes() {}

ExtractContentTypes.prototype = {
  start: function () {
    successLogger('info', 'exporting content-types...');
    const self = this;

    return when.promise((resolve, reject) => {
      self.createFixedCTs();
      self
        .getcontenttypes()
        .then((results) => {
          successLogger(
            'info',
            'Updated priority and reference/file field of Content Types.'
          );
          resolve();
        })
        .catch((error) => {
          console.log(error);
          errorLogger('error', JSON.stringify(error));
          return reject();
        });
    });
  },
  getcontenttypes: function () {
    const self = this;
    return when.promise((resolve, reject) => {
      const locale = 'us' + path.sep + config.aemLocales[0];

      const folder = read(config.sitecore_folder);
      const CTPaths = folder
        .map((f) => f.split(locale)[1])
        .map((a) => {
          if (a) {
            const x = a.split(path.sep);
            x.shift();
            return x;
          }
        });
      let CTObj = {};
      CTPaths.map((ct) => {
        if (ct) {
          let ctName = ct.reverse()[1];
          let filePath = folder.find((el) =>
            el.includes(ctName + path.sep + ct[0])
          );

          if (ctName && !Object.keys(CTObj).includes(ctName)) {
            CTObj[ctName.toString()] = [filePath];
          } else if (ctName) {
            CTObj[ctName.toString()].push(filePath);
          }
        }
      });

      Object.keys(CTObj).map((singleCT) => {
        self
          .createcontenttypes(singleCT, CTObj[singleCT])
          .then((results) => {})
          .catch((error) => {
            errorLogger('error', JSON.stringify(error));
          });
      });
      resolve();
    });
  },
  createcontenttypes: function (CTName, files) {
    const self = this;
    return when.promise((resolve, reject) => {
      try {
        let schema = [];
        let forDeletion = [
          'layout',
          'sling:resourceType',
          'jcr:primaryType',
          'jcr:lastModifiedBy',
          'jcr:lastModified',
          'spacer',
          'columncontrol',
          'alignment',
          'container',
        ];
        for (let i = 0; i < files.length; i++) {
          let alldata = helper.readFile(
            path.join(config.sitecore_folder, files[i])
          );
          let data =
            alldata['jcr:content']?.root?.container?.container ??
            alldata['jcr:content']?.root?.container;
          schema.push(Object.keys(data).map((d) => d.split('_')[0]));
          schema = schema.flat();

          schema = [...new Set(schema)];
        }
        schema = schema.filter((item) => !forDeletion.includes(item));

        schema = schema.map((el) => {
          let referenceObj = { ...reference };
          referenceObj.reference_to = [el];
          referenceObj.display_name = el;
          referenceObj.uid = el;
          return referenceObj;
        });
        schema.unshift(
          {
            data_type: 'text',
            display_name: 'Title',
            field_metadata: { _default: true, version: 1 },
            mandatory: true,
            uid: 'title',
            unique: true,
            multiple: false,
            non_localizable: false,
          },
          {
            data_type: 'text',
            display_name: 'URL',
            uid: 'url',
            field_metadata: { _default: true, version: 1 },
            multiple: false,
            unique: false,
            mandatory: false,
            non_localizable: false,
          }
        );
        let content_type = {
          title: CTName,
          uid: CTName.replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/^_+/, '')
            .replace(/_+/g, '_')
            .toLowerCase(),
          schema: schema,
        };
        // schemaData.push(content_type);
        helper.writeFile(
          path.join(
            process.cwd(),
            config.data,
            'content_types',
            content_type.uid
          ),
          JSON.stringify(content_type, null, 4)
        );

        // helper.writeFile(
        //   path.join(process.cwd(), config.data, "content_types", "schema"),
        //   JSON.stringify(schemaData, null, 4)
        // );
        resolve();
      } catch (error) {
        console.log(error);
        reject();
      }
    });
  },
  createFixedCTs: function () {
    const readPath = path.join(process.cwd(), 'libs', 'content_types');
    const fixedCTsPaths = read(readPath);

    for (let i = 0; i < fixedCTsPaths.length; i++) {
      let writePath = path.join(
        contentTypeFolderPath,
        path.basename(fixedCTsPaths[i]).replace('.json', '')
      );
      helper.writeFile(writePath, {});
      fs.copyFile(
        path.join(readPath, fixedCTsPaths[i]),
        writePath + '.json',
        (err) => {
          if (err) {
            console.error(err);
          }
        }
      );
    }
  },
};

module.exports = ExtractContentTypes;
