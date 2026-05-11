const fs = require('fs');
const logger = require('./loggerConfig');
const axios = require('axios');
const {
  fetchNewsDataIO,
  fetchTheNewsAPI,
  fetchNewsAPIOrg,
  fetchGNewsIO,
  fetchCurrentsAPI,
  fetchMediastackAPI,
  fetchScrapingDogGoogleNews // ✅ new import
} = require('./newsDataClient');


var TotalCompanies = 0;

const config = require('./config.json');
const { loggers } = require('winston');
const { PORTEND_EMAIL, PORTEND_PASSWORD, SLEEP_MINUTES } = config;

let gnewsQuotaExceeded = false;
let skipCount = 0;

// Normalize articles
function normalizeArticle(article) {
  const isValidDate = (date) => {
    try {
      return !isNaN(Date.parse(date));
    } catch {
      return false;
    }
  };

  return {
    title: article.title || '',
    author: article.author || '',
    publishedAt: isValidDate(article.publishedAt)
      ? new Date(article.publishedAt).toISOString()
      : new Date().toISOString(),
    description: article.description || '',
    url: article.url || '',
    publicationId: ''
  };
}

// Login to Portend
async function loginToPortend() {
  try {
    const res = await axios.post('https://dev-platform2.portend.io/nexus/v1/login', {
      email: PORTEND_EMAIL,
      password: PORTEND_PASSWORD
    });

    const sessionId = res.data?.data?.sessionId;
    const statusCode = res.status;

    if (!sessionId) {
      logger.warn(`⚠️ Login response received with status ${statusCode} but sessionId is missing`);
      throw new Error(`Missing sessionId. Status: ${statusCode}`);
    }

    console.log(`🔐 Logged into Portend (Status: ${statusCode}), sessionId obtained`);
    logger.info(`🔐 Logged into Portend (Status: ${statusCode}), sessionId obtained`);
    return sessionId;

  } catch (err) {
    if (err.response) {
      // Server responded with a status code outside 2xx
      const status = err.response.status;
      const message = err.response.data?.message || err.message;
      console.error(`❌ Portend login failed with status ${status}: ${message}`);
      logger.error(`❌ Portend login failed with status ${status}: ${message}`);
    } else {
      // No response received or other error
      console.error('❌ Portend login failed:', err.message);
      logger.error(`❌ Portend login failed: ${err.message}`);
    }
    return null;
  }
}


// Get companies with dynamic skip
async function getCompanyNames(sessionId, skip) {
  try {
    const res = await axios.get(
      `https://dev-platform2.portend.io/nexus/v1/companies?usedInCheck=true&limit=5&skip=${skip}`,
      { headers: { sessionId } }
    );

    const statusCode = res.status;
    const companies = res.data?.data?.list || [];
    TotalCompanies = res.data?.data?.count;

    if (companies.length === 0) {
      console.error(`❌ No companies found (Status: ${statusCode}).`);
      logger.error(`❌ No companies found (Status: ${statusCode}).`);
      return [];
    }

    const names = companies.map(c => c.name).filter(Boolean);
    console.log(`🏢 Retrieved company names (Status: ${statusCode}): ${names.join(', ')}`);
    logger.info(`🏢 Retrieved company names (Status: ${statusCode}): ${names.join(', ')}`);
    return names;

  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      const message = err.response.data?.message || err.message;
      console.error(`❌ Failed to fetch company names (Status: ${status}): ${message}`);
      logger.error(`❌ Failed to fetch company names (Status: ${status}): ${message}`);
    } else {
      console.error('❌ Failed to fetch company names:', err.message);
      logger.error(`❌ Failed to fetch company names: ${err.message}`);
    }
    return [];
  }
}


// Send news to Portend
async function sendNewsToPortend(sessionId, newsJsonString) {
  try {
    const newsArray = JSON.parse(newsJsonString);

    const filteredNews = newsArray.filter(item =>
      item.title && item.url && item.publishedAt && item.description
    );

    if (filteredNews.length === 0) {
      console.log('⚠️ No valid articles to send to Portend.');
      logger.info('⚠️ No valid articles to send to Portend.');
      return;
    }

    console.log('📦 Preview of first 2 articles:', JSON.stringify(filteredNews.slice(0, 2), null, 2));
    logger.info('📦 Preview of first 2 articles:', JSON.stringify(filteredNews.slice(0, 2), null, 2));

    const res = await axios.post(
      'https://dev-platform2.portend.io/nexus/v1/news/',
      filteredNews,
      {
        headers: {
          sessionId,
          'Content-Type': 'application/json'
        }
      }
    );

    const statusCode = res.status;
    console.log(`✅ Sent ${filteredNews.length} articles to Portend (Status: ${statusCode}).`);
    logger.info(`✅ Sent ${filteredNews.length} articles to Portend (Status: ${statusCode}).`);

  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      const message = err.response.data?.message || err.message;
      console.error(`❌ Failed to send news to Portend (Status: ${status}): ${message}`);
      logger.error(`❌ Failed to send news to Portend (Status: ${status}): ${message}`);
    } else {
      console.error('❌ Failed to send news to Portend:', err.message);
      logger.error(`❌ Failed to send news to Portend: ${err.message}`);
    }
  }
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main loop
(async function runForever() {
  while (true) {
    console.log('\n🌀 Starting new cycle');
    logger.info('🌀 Starting new cycle');

    const sessionId = await loginToPortend();
    if (!sessionId) {
      console.error('❌ Cannot proceed without Portend sessionId. Retrying after sleep...');
      logger.error('❌ Cannot proceed without Portend sessionId. Retrying after sleep...');
      await sleep(SLEEP_MINUTES * 60 * 1000);
      continue;
    }

    const companies = await getCompanyNames(sessionId, skipCount);

    if (TotalCompanies === skipCount) {
      logger.info(`🔁 All companies processed. Resetting skipCount to 0 (Total: ${TotalCompanies})`);
      skipCount = 0;
      continue;
    }

    if (companies.length === 0) {
      console.error('❌ No companies to process. Retrying after sleep...');
      logger.error('❌ No companies to process. Retrying after sleep...');
      await sleep(SLEEP_MINUTES * 60 * 1000);
      continue;
    }

    skipCount += 5;
    logger.info(`➡️ skipCount updated to: ${skipCount}`);

    for (const topic of companies) {
      console.log(`🔍 Fetching news for: ${topic}`);
      logger.info(`🔍 Fetching news for: ${topic}`);

      const promises = [
        fetchNewsDataIO(topic),
        fetchTheNewsAPI(topic),
        fetchNewsAPIOrg(topic),
        fetchCurrentsAPI(topic),
        fetchMediastackAPI(topic),
        fetchScrapingDogGoogleNews(topic) // ✅ new
      ];


      if (!gnewsQuotaExceeded) {
        const gnewsPromise = fetchGNewsIO(topic).catch(error => {
          if (error.response?.status === 403 || error.response?.status === 429) {
            gnewsQuotaExceeded = true;
            console.warn('⚠️ GNews.io quota exceeded or rate limit hit.');
            logger.warn('⚠️ GNews.io quota exceeded or rate limit hit.');
            return [];
          }
          logger.error(`❌ Unexpected error from GNews.io: ${error.message}`);
          throw error;
        });
        promises.push(gnewsPromise);

        await sleep(2000); // ⏳ Delay for GNews rate limit
      }

      let results;
      try {
        results = await Promise.all(promises);
      } catch (err) {
        console.error(`❌ Failed to fetch news for topic "${topic}":`, err.message);
        logger.error(`❌ Failed to fetch news for topic "${topic}": ${err.message}`);
        continue;
      }

      const combined = results.flat();
      logger.info(`📊 Total articles fetched for "${topic}": ${combined.length}`);

      if (combined.length === 0) {
        console.log(`❌ No articles found for: ${topic}`);
        logger.info(`❌ No articles found for: ${topic}`);
        continue;
      }

      const normalizedArticles = combined.map(normalizeArticle);
      const jsonString = JSON.stringify(normalizedArticles, null, 2);

      try {
        await sendNewsToPortend(sessionId, jsonString);
      } catch (err) {
        console.error(`❌ Failed to send news for "${topic}":`, err.message);
        logger.error(`❌ Failed to send news for "${topic}": ${err.message}`);
      }
    }

    console.log(`⏱️ Sleeping for ${SLEEP_MINUTES} minutes...\n`);
    logger.info(`⏱️ Sleeping for ${SLEEP_MINUTES} minutes...\n`);
    await sleep(SLEEP_MINUTES * 60 * 1000);
  }
})();

