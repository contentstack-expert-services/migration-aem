const { JSDOM } = require('jsdom');
const { htmlToJson } = require('@contentstack/json-rte-serializer');
const querystring = require('querystring');

function textbanner(value, key) {
  try {
    let uidString = `${key} ${value['jcr:created']}`;
    let uid = uidString
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^_+/, '')
      .replace(/_+/g, '_')
      .toLowerCase();

    return {
      items: {
        content: [
          {
            uid: uid,
            _content_type_uid: 'text_banner',
          },
        ],
        _metadata: {
          uid: `cse${Math.floor(Math.random() * 100000000000000)}`,
        },
      },
    };
  } catch (error) {
    console.log(error);
  }
}

function carousel(value) {
  const teaserMapping = {
    content: Object.keys(value)
      .filter((key) => key.startsWith('teaser'))
      .map((teaserKey) => {
        const teaser = value[teaserKey];
        let uidString = `${teaserKey} ${teaser['jcr:created']}`;
        return {
          uid: uidString
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/^_+/, '')
            .replace(/_+/g, '_')
            .toLowerCase(),
          _content_type_uid: 'card',
        };
      }),
  };

  try {
    let pageScroll;
    if (value?.horizontalscroll_large.toLowerCase() === 'true') {
      pageScroll = true;
    } else if (value?.horizontalscroll_large.toLowerCase() === 'false') {
      pageScroll = false;
    }

    return {
      carousel: {
        title: value?.carousel_title,
        ...teaserMapping,
        visible_items: {
          base: parseFloat(value?.numberOfVisibleItems_base),
          sm: parseFloat(value?.numberOfVisibleItems_small),
        },
        page_scroll: pageScroll,

        _metadata: {
          uid: `cse${Math.floor(Math.random() * 100000000000000)}`,
        },
      },
    };
  } catch (error) {
    console.log(error);
  }
}

function text(value) {
  try {
    let text;
    if (value?.text) {
      text = querystring.unescape(value?.text);
    }

    const dom = new JSDOM(text);
    let htmlDoc = dom.window.document.querySelector('body');
    const jsonValue = htmlToJson(htmlDoc);
    // Initialize the response object with _metadata
    let response = {
      text: {
        _metadata: {
          uid: `cse${Math.floor(Math.random() * 100000000000000)}`,
        },
      },
    };

    // Add content key only if jsonValue is not empty
    if (jsonValue && Object.keys(jsonValue).length > 0) {
      response.text.content = jsonValue;
    }

    return response;
  } catch (error) {
    console.log(error);
  }
}

function experiencefragment(value, key) {
  try {
    let uidString = `${key} ${value['jcr:created']}`;
    let uid = uidString
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^_+/, '')
      .replace(/_+/g, '_')
      .toLowerCase();

    return {
      items: {
        content: [
          {
            uid: uid,
            _content_type_uid: 'product_list',
          },
        ],
        _metadata: {
          uid: `cse${Math.floor(Math.random() * 100000000000000)}`,
        },
      },
    };
  } catch (error) {
    console.log(error);
  }
}

function anchornavigation(value) {
  try {
    if (value?.actions) {
      actionArray = Object.keys(value?.actions)
        .filter((key) => key.startsWith('item')) // Filter out non-item keys
        .map((key) => ({
          title: value?.actions[key].text,
          href: value?.actions[key].link,
        }));
    }

    let bgValue;
    if (value?.backgroundColor === 'black') {
      bgValue = 'bg.primary';
    } else if (value?.backgroundColor === 'white') {
      bgValue = 'bg.inverted';
    } else {
      bgValue = 'bg.primary';
    }

    let textColor;
    if (value?.backgroundColor === 'black') {
      textColor = 'txt.primary';
    } else if (value?.backgroundColor === 'white') {
      textColor = 'txt.inverted';
    } else {
      textColor = 'txt.primary';
    }

    let alignment;
    if (value?.alignment === 'left') {
      alignment = 'flex-start';
    } else if (value?.alignment === 'center') {
      alignment = 'center';
    } else {
      alignment = 'flex-start';
    }

    return {
      anchor_nav: {
        background_color: bgValue ?? 'bg.primary',
        text_color: textColor ?? 'txt.primary',
        link: actionArray,
        alignment: alignment ?? 'flex-start',
        _metadata: {
          uid: `cse${Math.floor(Math.random() * 100000000000000)}`,
        },
      },
    };
  } catch (error) {
    console.log(error);
  }
}

function button(value) {
  try {
    let alignment;
    if (value?.alignment === 'left') {
      alignment = 'flex-start';
    } else if (value?.alignment === 'center') {
      alignment = 'center';
    } else if (value?.alignment === 'right') {
      alignment = 'flex-end';
    } else {
      alignment = 'flex-start';
    }

    let style;
    if (value?.variant === 'dark') {
      style = 'solid';
    } else if (value?.variant === 'light') {
      style = 'outline';
    } else if (value?.variant === 'ghost') {
      style = 'ghost';
    } else if (value?.variant === 'brand') {
      style = 'brand';
    } else if (value?.variant === 'link') {
      style = 'link';
    } else {
      style = 'solid';
    }

    return {
      button: {
        link: {
          title: value?.['jcr:title'],
          href: value?.link,
        },
        style: style ?? 'solid',
        alignment: alignment ?? 'flex-start',
        _metadata: {
          uid: `cse${Math.floor(Math.random() * 100000000000000)}`,
        },
      },
    };
  } catch (error) {
    console.log(error);
  }
}

function image(value, key) {
  try {
    let uidString = `${key} ${value['jcr:created']}`;
    let uid = uidString
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^_+/, '')
      .replace(/_+/g, '_')
      .toLowerCase();

    return {
      items: {
        content: [
          {
            uid: uid,
            _content_type_uid: 'card',
          },
        ],
        _metadata: {
          uid: `cse${Math.floor(Math.random() * 100000000000000)}`,
        },
      },
    };
  } catch (error) {
    console.log(error);
  }
}

function teaser(value, key) {
  try {
    let uidString = `${key} ${value['jcr:created']}`;
    let uid = uidString
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^_+/, '')
      .replace(/_+/g, '_')
      .toLowerCase();

    return {
      items: {
        content: [
          {
            uid: uid,
            _content_type_uid: 'card',
          },
        ],
        _metadata: {
          uid: `cse${Math.floor(Math.random() * 100000000000000)}`,
        },
      },
    };
  } catch (error) {
    console.log(error);
  }
}

function productlist(value, key) {
  try {
    let uidString = `${key} ${value['jcr:created']}`;
    let uid = uidString
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^_+/, '')
      .replace(/_+/g, '_')
      .toLowerCase();

    return {
      items: {
        content: [
          {
            uid: uid,
            _content_type_uid: 'product_list',
          },
        ],
        _metadata: {
          uid: `cse${Math.floor(Math.random() * 100000000000000)}`,
        },
      },
    };
  } catch (error) {
    console.log(error);
  }
}

function accordion(value) {
  const transformData = (data) => {
    // Initialize the result object with an empty items array
    const result = {
      items: [],
      _metadata: {
        uid: `cse${Math.floor(Math.random() * 100000000000000)}`,
      },
    };
    // Iterate over each key in the input data
    for (const key in data) {
      // Check if the key matches the "item" prefix
      if (key.startsWith('item')) {
        const item = data[key];
        const title = item['cq:panelTitle'];
        const text = item.text;
        if (title && text) {
          const uid = `${key} ${text['jcr:created']
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/^_+/, '')
            .replace(/_+/g, '_')
            .toLowerCase()}`;
          // Create the content item
          const contentItem = {
            uid,
            _content_type_uid: 'card',
          };
          // Push the new item to the result's items array
          result.items.push({
            title,
            content: [contentItem],
            _metadata: {
              uid: `cse${Math.floor(Math.random() * 100000000000000)}`,
            },
          });
        }
      }
    }
    return result;
  };

  return transformData(value);
}

module.exports = {
  textbanner,
  carousel,
  text,
  experiencefragment,
  anchornavigation,
  button,
  image,
  accordion,
  teaser,
  productlist,
};
