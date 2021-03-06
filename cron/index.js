const fetch = require('node-fetch');
const Parser = require('rss-parser');
const { WebClient } = require('@slack/client');

const FEED_URL = 'https://github.com/WordPress/WordPress/releases.atom';
const TRAVIS_REPO = 'roots%2Fwordpress'

async function notifySlack(tag) {
  const token = process.env.SLACK_TOKEN;
  const web = new WebClient(token);

  try {
    const response = await web.chat.postMessage({
      channel: '#bedrock',
      as_user: false,
      username: 'Lambda',
      icon_emoji: ':bedrock:',
      text: `TravisCI build triggered for tag ${tag}`
    });

    console.log('Slack message sent', response.ts);
  } catch(error) {
    console.log(error);
  }
}

async function triggerTravisBuild() {
  const body = {
    request: { branch: "src" }
  };

  try {
    const response = await fetch(`https://api.travis-ci.com/repo/${TRAVIS_REPO}/requests`, {
      method: 'post',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Travis-API-Version': '3',
        'Authorization': `token ${process.env.TRAVIS_API_KEY}`,
      }
    });

    const data = await response.json();
  } catch (error) {
    console.error(error);
  }

  console.log('Travis CI build triggered');
};

async function getLatestReleaseInFeed() {
  const parser = new Parser();
  const feed = await parser.parseURL(FEED_URL);

  return feed.items[0].title.replace('Tag ', '');
};

async function getLatestReleaseInRepo(tag) {
  const response = await fetch(`https://api.github.com/repos/roots/wordpress/releases/tags/${tag}`);
  const data = await response.json();

  return data.id;
};

exports.wordpressRelease = async (event, context) => {
  const tag = await getLatestReleaseInFeed();
  console.log(`Latest wordpress/wordpress release: ${tag}`)
  const release = await getLatestReleaseInRepo(tag);

  if (!release) {
    console.log(`Release for ${tag} does not in roots/wordpress`);
    triggerTravisBuild();
    notifySlack(tag);
  } else {
    console.log(`Release for ${tag} already exists in roots/wordpress`);
  }
}
