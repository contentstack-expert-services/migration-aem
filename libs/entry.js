const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs');
var when = require('when');

const helper = require('../utils/helper');

var entryFolderPath = path.resolve(config.data, config.modules.entries.dirName);
if (!fs.existsSync(entryFolderPath)) {
  mkdirp.sync(entryFolderPath);
  mkdirp.sync(path.join(entryFolderPath, 'product_listing_page'));
} else {
  mkdirp.sync(path.join(entryFolderPath, 'product_listing_page'));
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

// to convert seo description to html
function decodeUnicode(text) {
  return text.replace(/\\u([\dA-F]{4})/gi, (match, grp) => {
    return String.fromCharCode(parseInt(grp, 16));
  });
}

// to convert breadcrumb block data
function breadcrumbData(data) {
  const result = [];
  for (const [key, value] of Object.entries(data)) {
    result.push({
      title: key,
      href: value,
    });
  }
  return result;
  //   return data.map((item) => ({
  //     title: item.title,
  //     href: item.href,
  //   }));
}

// to convert leftNav block navdetails
function navDetailsData(data) {
  return data.map((item) => ({
    title: item.title,
    url: item.url,
    _metadata: { uid: `cs${Math.floor(Math.random() * 100000000000000)}` },
    show_caret: item.showCaret,
    hide_in_app: item.hideInApp,
  }));
}

// to convert inlineContent block data
function inlineContentDetails(data) {
  const result = [];

  const assetsId = helper.readFile(
    path.join(config.data, 'assets', 'assets.json')
  );

  for (const [inlineKey, inlineValue] of Object.entries(data)) {
    const transformedItems = inlineValue.map((item) => ({
      device: inlineKey,
      heading: '',
      component_name: item.componentName,
      _metadata: {
        uid: `cs${Math.floor(Math.random() * 100000000000000)}`,
      },
      sub_heading: '',
      asset_details: {
        url: item?.props?.imageUrl,
        video: Object.values(assetsId).find(
          (asset) =>
            asset.uid ===
            item?.props?.videoPath
              .replace(/[^a-zA-Z0-9]+/g, '_')
              .replace(/^_+|_+$/g, '')
              .toLowerCase()
        ),
        video_with_audio: item?.props?.videoWithAudio,
        alternate_text: item?.props?.imageAltText,
      },
      headline_text: item?.props?.headlineText,
      cta: {
        alignment: item?.props?.cta?.alignment || 'left',
        links:
          item?.props?.cta?.links?.map((link) => ({
            text: link.ctaText,
            _metadata: {
              uid: `cs${Math.floor(Math.random() * 100000000000000)}`,
            },
            url: link.ctaUrl,
            type: link.ctaType,
            link_behavior: link.linkBehavior,
          })) || [],
      },
      content_placement: {
        placement:
          parseInt(item?.newPlacement, 10) || parseInt(item?.placement, 10),
        rows: parseInt(item?.props?.row, 10),
        columns: parseInt(item?.props?.col, 10),
      },
    }));

    result.push(...transformedItems);
  }

  return result;
}

// to convert carousel block data
function carouselDetails(data) {
  const result = [];

  const assetsId = helper.readFile(
    path.join(config.data, 'assets', 'assets.json')
  );

  for (const [inlineKey, inlineValue] of Object.entries(data)) {
    const transformedItems = inlineValue.map((item) => ({
      device: inlineKey,
      component_name: item?.componentName,
      headline_text: item?.props?.headlineText,
      _metadata: { uid: `cs${Math.floor(Math.random() * 100000000000000)}` },
      cards:
        item?.props?.cards?.map((card) => ({
          image: Object.values(assetsId).find(
            (asset) =>
              asset.uid ===
              card?.imagePath
                .replace(/[^a-zA-Z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '')
                .toLowerCase()
          ),
          url: card.imageUrl,
          alternate_text: card.imageAltText,
          type: card.type,
          cta: {
            text: '',
            url: '',
            type: null,
            link_behavior: card.linkBehavior,
          },
          _metadata: {
            uid: `cs${Math.floor(Math.random() * 100000000000000)}`,
          },
        })) || [],
    }));

    result.push(...transformedItems);
  }

  return result;
}

ExtractEntries.prototype = {
  saveEntry: function (entries) {
    var self = this;

    return new Promise(async function (resolve, reject) {
      const filePath = path.join(
        path.join(entryFolderPath, 'product_listing_page'),
        'en-us.json'
      );

      let entriesData = readEntriesFile(filePath);
      const promises = [];

      const seoDecodedDescription = decodeUnicode(
        `${entries?.CategorySummary?.seoDescription
          .replace(/\"/g, "'")
          .replace(/\r\n/g, '<br>')}`
      );
      //   const dom = new JSDOM(seoDecodedDescription.replace(/\"/g, "'"), {
      //     virtualConsole,
      //   });
      //   let htmlDoc = dom.window.document.querySelector('body');

      //   const jsonValue = htmlToJson(htmlDoc);

      const breadcrumbDetails = breadcrumbData(entries?.BreadcrumbSummary);

      const transformedNavDetails = navDetailsData(
        entries?.LeftNavSummary?.NavDetails
      );

      // for InlineContent block
      const transformedInlineContentBlocks = inlineContentDetails(
        entries?.InlineContentSummary
      );

      const carouselBlocks = carouselDetails(entries?.CarouselSummary);

      entriesData['blt1cb881b81020cba7'] = {
        uid: 'blt1cb881b81020cba7',
        title: entries?.CategorySummary?.navTitle,
        seo: {
          seo_title: entries?.CategorySummary?.seoTitle,
          seo_description: seoDecodedDescription,
          meta_description: entries?.CategorySummary?.metaDescription,
          conical_link: entries?.CategorySummary?.canonicalLink,
          robot_tags: entries?.CategorySummary?.robotsTag,
        },
        category_details: {
          category_id: entries?.CategorySummary?.categoryId,
          segmented_category_view_type:
            entries?.CategorySummary?.segmentedCategoryViewType,
          allow_shop_my_store: entries?.CategorySummary?.allowShopMyStore,
          items_per_page: parseInt(entries?.CategorySummary?.itemsPerPage, 10),
          hybrid_category_page: entries?.CategorySummary?.hybridCategoryPage,
          segmented_category_page:
            entries?.CategorySummary?.segmentedCategoryPage,
          shop_my_size: entries?.CategorySummary?.shopMySize,
          pdp_cross_sell_header: entries?.CategorySummary?.pdpCrossSellHeader,
        },
        breadcrumb: {
          link: breadcrumbDetails,
        },
        left_nav: {
          title: entries?.LeftNavSummary?.topCategoryTitle,
          nav_details: transformedNavDetails,
        },
        inline_content_blocks: transformedInlineContentBlocks,
        carousel: carouselBlocks,
      };

      writeEntriesFile(filePath, entriesData);

      Promise.all(promises)
        .then(() => {
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  getAllEntries: function (templatePaths) {
    var self = this;

    return when
      .promise(function (resolve, reject) {
        //for reading json file and store in alldata
        const alldata = helper?.readFile(templatePaths);

        self.saveEntry(alldata);

        resolve();
      })
      .catch(function (e) {
        console.log(e);
      });
  },

  start: function () {
    var self = this;
    successLogger('exporting entries...');

    return new Promise(async function (resolve, reject) {
      try {
        await self.getAllEntries(global.config.aem_folder);

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  },
};
module.exports = ExtractEntries;
