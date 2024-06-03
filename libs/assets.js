const mkdirp = require("mkdirp");
const path = require("path");
const fs = require("fs");
const helper = require("../utils/helper");

var guard = require("when/guard"),
  parallel = require("when/parallel"),
  when = require("when"),
  axios = require("axios");

const chalk = require("chalk");

var assetConfig = config.modules.asset,
  assetFolderPath = path.resolve(config.data, assetConfig.dirName),
  assetMasterFolderPath = path.resolve(process.cwd(), "logs", "assets"),
  failedJSON =
    helper.readFile(path.join(assetMasterFolderPath, "aem_failed")) || {};
failedJSON =
  helper.readFile(path.join(assetMasterFolderPath, "aem_failed")) || {};

if (!fs.existsSync(assetFolderPath)) {
  mkdirp.sync(assetFolderPath);
  helper.writeFile(path.join(assetFolderPath, "assets"));
  mkdirp.sync(assetMasterFolderPath);
} else {
  if (!fs.existsSync(path.join(assetFolderPath, "assets.json")))
    helper.writeFile(path.join(assetFolderPath, "assets"));
  if (!fs.existsSync(assetMasterFolderPath)) {
    mkdirp.sync(assetMasterFolderPath);
  }
}

//Reading a File
var assetData = helper.readFile(path.join(assetFolderPath, "assets.json"));

function ExtractAssets() {}

ExtractAssets.prototype = {
  saveAsset: function (assetUrl, retryCount) {
    var self = this;
    return when.promise(async function (resolve, reject) {
      try {
        const processUrl = async (url, isFileReference, backcountryurl="") => {
          // const name = (url?.match(/\/content\/dam\/bcs\/projects\/(.*)/) ||
          //   [])[1]?.replace(/\//g, " ");

          const name = (url?.match(/\/content\/dam\/(.*)/) || [])[1]?.replace(
            /\//g,
            " "
          );
          if (name) {
            const uid = url
              .replace(/[^a-zA-Z0-9]+/g, "_")
              .replace(/^_+|_+$/g, "")
              .toLowerCase();

            // Modify the URL based on the source
            // if (isFileReference) {
            //   const modifyUrl = url.match(/\/([^\/]+)\.[^\/]+$/)?.[1] || null;
            //   url = `https://s7d1.scene7.com/is/image/backcountry/${modifyUrl}`;
            // } else {
            //   url = url.replace(
            //     '/content/',
            //     'https://content.backcountry.com/'
            //   );
            // }
            // console.log(isFileReference,backcountryurl)
            // if (isFileReference) {
              if (backcountryurl && backcountryurl !== "" && backcountryurl !== undefined) {
                url = backcountryurl;
              } else {
       
                url = url.replace(
                  "/content/",
                  "https://content.backcountry.com/"
                );
              }
            // } else {
            //   console.log("Video reference of url",url)
            //   url = url.replace(
            //     "/content/",
            //     "https://content.backcountry.com/"
            //   );
            // }
            // url = url.replace(
            //   "/content/",
            //   "https://content.competitivecyclist.com/"
            // );

            const assetPath = path.resolve(assetFolderPath, uid);

            if (fs.existsSync(path.join(assetPath, name))) {
              console.log(
                "An asset with id",
                chalk.red(uid),
                "and name",
                chalk.red(name),
                "already present."
              );
              resolve(uid);
            } else {
              try {
                const response = await axios.get(url, {
                  responseType: "arraybuffer",
                });
                if (response.status === 200) {
                  mkdirp.sync(assetPath);
                  fs.writeFileSync(path.join(assetPath, name), response.data);
                  const stats = fs.lstatSync(path.join(assetPath, name));

                  assetData[uid] = {
                    uid: uid,
                    urlPath: `/assets/${uid}`,
                    status: true,
                    file_size: `${stats.size}`,
                    tag: [],
                    filename: name,
                    url: url,
                    is_dir: false,
                    parent_uid: "migrationasset",
                    _version: 1,
                    title: name,
                    publish_details: [],
                  };

                  console.log(
                    "An asset with id",
                    chalk.green(uid),
                    "and name",
                    chalk.green(name),
                    "got downloaded successfully."
                  );

                  const assetVersionInfoFile = path.resolve(assetPath, uid);
                  helper.writeFile(
                    assetVersionInfoFile,
                    JSON.stringify(assetData[uid], null, 4)
                  );

                  if (failedJSON[uid]) {
                    delete failedJSON[uid];
                  }

                  helper.writeFile(
                    path.join(assetMasterFolderPath, "asset.json"),
                    JSON.stringify(assetData, null, 4)
                  );

                  resolve(uid);
                } else {
                  throw new Error(
                    `Failed with status code: ${response.status}`
                  );
                }
              } catch (err) {
                failedJSON[uid] = {
                  failedUid: uid,
                  name: name,
                  url: url,
                  reason_for_error: err.message,
                };
                helper.writeFile(
                  path.join(assetMasterFolderPath, "aem_failed.json"),
                  JSON.stringify(failedJSON, null, 4)
                );
                resolve(uid);
              }
            }
          }
        };

        if (assetUrl?.fileReference) {
          await processUrl(
            assetUrl.fileReference,
            true,
            assetUrl?.backcountryurl
          ); // true indicates it's a fileReference
        }
        if (assetUrl?.videoAsset) {
          await processUrl(assetUrl.videoAsset, false); // false indicates it's a videoAsset
        }
        resolve();
      } catch (error) {
        console.log("error", error);
        reject();
      }
    });
  },

  getAsset: function (attachments) {
    var self = this;

    return when.promise(async function (resolve, reject) {
      // Initialize assetData
      try {
        var _getAsset = [];

        // check total length of asset attachment pass from the getAllAssets
        for (var i = 0, total = attachments.length; i < total; i++) {
          _getAsset.push(
            (function (data) {
              return function () {
                return self.saveAsset(data, 0);
              };
            })(attachments[i])
          );
        }

        var guardTask = guard.bind(null, guard.n(5));
        _getAsset = _getAsset.map(guardTask);
        var taskResults = parallel(_getAsset);
        taskResults
          .then(function (results) {
            helper.writeFile(
              path.join(assetFolderPath, "assets"),
              JSON.stringify(assetData, null, 4)
            );
            helper.writeFile(
              path.join(assetMasterFolderPath, "aem_failed"),
              JSON.stringify(failedJSON, null, 4)
            );
            resolve(results);
          })
          .catch(function (e) {
            errorLogger("failed to download assets: ", e);
            resolve();
          });
        resolve();
      } catch (error) {
        console.log("error", error);
        reject();
      }
    });
  },

  getAllAssets: function ({ templatePaths }) {
    var self = this;
    return when.promise(async function (resolve, reject) {
      try {
        const data = helper?.readFile(templatePaths);

        let jsonArray = ["image", "teaser", "carousel", "textbanner"];

        // Function to filter JSON based on prefixes recursively
        function filterJson(json, prefixes) {
          let result = [];
          if (json === undefined) {
            return [];
          }
          // Iterate through the keys of the json object
          Object.keys(json).forEach((key) => {
            // Check if the key starts with any of the prefixes
            if (prefixes.some((prefix) => key.startsWith(prefix))) {
              // Extract the desired properties from the current object
              let { fileReference, alt, videoAsset } = json[key] || {};

              // Add the extracted properties to the result array only if they exist
              if (fileReference || alt || videoAsset) {
                result.push({ fileReference, alt, videoAsset });
              }
            }

            // If the value is an object, recursively call the function
            if (typeof json[key] === "object" && json[key] !== null) {
              let nestedResult = filterJson(json[key], prefixes);
              // Merge the nested result with the current result
              result = result.concat(nestedResult);
            }
          });

          return result;
        }

        let modifiedJsonArray = filterJson(
          data["jcr:content"]?.root?.container?.container,
          jsonArray
        );
        modifiedJsonArray.forEach((el) => {
          const dataPath = templatePaths.replace(".infinity", ".backcountry");
          const bcData = helper.readFile(dataPath);

          el.name = el.fileReference?.split("/").reverse()[0];
          el.name = helper.removeLastDelimiter(el.name, ".");
          let keys = Object.keys(bcData).filter((el) => {
            return el.toString().includes("src.large");
          });
          const images = keys.map((key) => bcData[key]);
          const mapper = {};
          images.forEach((image) => {
            let filename = image.split(":")[0].split("/").reverse()[0];
            filename = helper.removeLastDelimiter(filename, "-");
            mapper[filename.toString()] = image;
          });
          el.backcountryurl = mapper?.[el.name]
            ? `https:${mapper?.[el.name]}`
            : undefined;
        });
        // Check if the array is empty or not
        if (modifiedJsonArray.length !== 0) {
          await self.getAsset(modifiedJsonArray);
        }

        resolve();
      } catch (error) {
        console.log(error);
        reject();
      }
    });
  },

  start: function (aemFile) {
    var self = this;
    successLogger("exporting assets...");
    return new Promise(async function (resolve, reject) {
      try {
        for (const templatePaths of aemFile || []) {
          // console.log(templatePaths);
          await self.getAllAssets({ templatePaths });
        }

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  },
};

module.exports = ExtractAssets;
