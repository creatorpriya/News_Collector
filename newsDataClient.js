const axios = require('axios');
const CurrentsAPI = require('currentsapi');
const config = require('./config.json');
const logger = require('./loggerConfig');

const {
  NEWSDATA_API_KEY,
  THENEWSAPI_TOKEN,
  NEWSAPI_KEY,
  GNEWS_API_KEY,
  CURRENTS_API_KEY,
  MEDIASTACK_API_KEY,
  SCRAPINGDOG_API_KEY
} = config;


let gnewsQuotaExceeded = false;

// --- Service 1: NewsData.io ---
async function fetchNewsDataIO(topic) {
  const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&q=${encodeURIComponent(topic)}&language=en`;

  try {
    const response = await axios.get(url);
    const statusCode = response.status;
    const articles = response.data.results || [];
    console.log(`📰 NewsData.io articles fetched: ${articles.length} (Status: ${statusCode})`);
    logger.info(`📰 NewsData.io articles fetched for "${topic}": ${articles.length} (Status: ${statusCode})`);

    return articles.map(article => ({
      title: article.title || '',
      author: article.source_id || '',
      publishedAt: article.pubDate || '',
      description: article.description || '',
      url: article.link || '',
      publicationId: ''
    }));
  } catch (error) {
    const status = error.response?.status ?? '0';
    const message = error.response?.data?.message || error.message;
    console.error(`❌ Error fetching NewsData.io (Status: ${status}): ${message}`);
    logger.error(`❌ Error fetching NewsData.io for "${topic}" (Status: ${status}): ${message}`);
    return [];
  }
}

// --- Service 2: TheNewsAPI ---
async function fetchTheNewsAPI(topic) {
  const url = `https://api.thenewsapi.com/v1/news/all?api_token=${THENEWSAPI_TOKEN}&search=${encodeURIComponent(topic)}&language=en`;

  try {
    const response = await axios.get(url);
    const statusCode = response.status;
    const articles = response.data.data || [];
    console.log(`📰 TheNewsAPI articles fetched: ${articles.length} (Status: ${statusCode})`);
    logger.info(`📰 TheNewsAPI articles fetched for "${topic}": ${articles.length} (Status: ${statusCode})`);

    return articles.map(article => ({
      title: article.title || '',
      author: article.source || '',
      publishedAt: article.published_at || '',
      description: article.description || '',
      url: article.url || '',
      publicationId: ''
    }));
  } catch (error) {
    const status = error.response?.status ?? '0';
    const message = error.response?.data?.message || error.message;
    console.error(`❌ Error fetching TheNewsAPI (Status: ${status}): ${message}`);
    logger.error(`❌ Error fetching TheNewsAPI for "${topic}" (Status: ${status}): ${message}`);
    return [];
  }
}

// --- Service 3: NewsAPI.org ---
async function fetchNewsAPIOrg(topic) {
  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: topic,
        sortBy: 'publishedAt',
        language: 'en',
        pageSize: 20,
        apiKey: NEWSAPI_KEY
      }
    });

    const statusCode = response.status;
    const articles = response.data.articles || [];
    console.log(`📰 NewsAPI.org articles fetched: ${articles.length} (Status: ${statusCode})`);
    logger.info(`📰 NewsAPI.org articles fetched for "${topic}": ${articles.length} (Status: ${statusCode})`);

    return articles.map(article => ({
      title: article.title || '',
      author: article.author || article.source?.name || '',
      publishedAt: article.publishedAt || '',
      description: article.description || '',
      url: article.url || '',
      publicationId: ''
    }));
  } catch (error) {
    const status = error.response?.status ?? '0';
    const message = error.response?.data?.message || error.message;
    console.error(`❌ Error fetching NewsAPI.org (Status: ${status}): ${message}`);
    logger.error(`❌ Error fetching NewsAPI.org for "${topic}" (Status: ${status}): ${message}`);
    return [];
  }
}

// --- Service 4: GNews.io ---
async function fetchGNewsIO(topic) {
  if (gnewsQuotaExceeded) {
    console.warn(`⚠️ GNews.io quota exceeded. Skipping.`);
    logger.warn(`⚠️ GNews.io quota exceeded. Skipping request for "${topic}".`);
    return [];
  }

  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(topic)}&lang=en&max=10&apikey=${GNEWS_API_KEY}`;

  try {
    const response = await axios.get(url);
    const statusCode = response.status;
    const articles = response.data.articles || [];
    console.log(`📰 GNews.io articles fetched: ${articles.length} (Status: ${statusCode})`);
    logger.info(`📰 GNews.io articles fetched for "${topic}": ${articles.length} (Status: ${statusCode})`);

    return articles.map(article => ({
      title: article.title || '',
      author: article.source?.name || '',
      publishedAt: article.publishedAt || '',
      description: article.description || '',
      url: article.url || '',
      publicationId: ''
    }));
  } catch (error) {
    const status = error.response?.status ?? 'No response';
    const message = error.response?.data?.message || error.message;

    if (status === 403 || status === 429) {
      gnewsQuotaExceeded = true;
      console.warn(`⚠️ GNews.io quota exceeded. Further requests disabled.`);
      logger.warn(`⚠️ GNews.io quota exceeded for "${topic}". Status: ${status}`);
    } else {
      console.error(`❌ Error fetching GNews.io (Status: ${status}): ${message}`);
      logger.error(`❌ Error fetching GNews.io for "${topic}" (Status: ${status}): ${message}`);
    }
    return [];
  }
}

// --- Service 5: Currents News API ---
async function fetchCurrentsAPI(topic) {
  try {
    const response = await axios.get('https://api.currentsapi.services/v1/search', {
      params: {
        keywords: topic,
        language: 'en',
        page_size: 10,
        limit: 10,
        apiKey: CURRENTS_API_KEY
      }
    });

    const statusCode = response.status;
    const articles = response.data.news || [];

    console.log(`📰 Currents API articles fetched: ${articles.length} (Status: ${statusCode})`);
    logger.info(`📰 Currents API articles fetched for "${topic}": ${articles.length} (Status: ${statusCode})`);

    return articles.map(article => ({
      title: article.title || '',
      author: article.author || '',
      publishedAt: article.published || '',
      description: article.description || '',
      url: article.url || '',
      publicationId: article.id || ''
    }));
  } catch (error) {
    const status = error.response?.status ?? '0';
    const message = error.response?.data?.message || error.message;
    console.error(`❌ Error fetching Currents API (Status: ${status}): ${message}`);
    logger.error(`❌ Error fetching Currents API for "${topic}" (Status: ${status}): ${message}`);
    return [];
  }
}

// --- Service 6: Mediastack API ---
async function fetchMediastackAPI(topic) {
  try {
    const response = await axios.get('https://api.mediastack.com/v1/news', {
      params: {
        access_key: MEDIASTACK_API_KEY, // Your mediastack API key here
        keywords: topic,
        languages: 'en',
        limit: 10,       // number of results per page
        sort: 'published_desc' // newest first
      }
    });

    const statusCode = response.status;
    const articles = response.data.data || [];

    console.log(`📰 Mediastack API articles fetched: ${articles.length} (Status: ${statusCode})`);
    logger.info(`📰 Mediastack API fetched for "${topic}": ${articles.length} (Status: ${statusCode})`);

    return articles.map(article => ({
      title: article.title || '',
      author: article.author || '',
      publishedAt: article.published_at || '',
      description: article.description || '',
      url: article.url || '',
      publicationId: ''  // mediastack does not provide article id
    }));
  } catch (error) {
    const status = error.response?.status ?? '0';
    const message = error.response?.data?.error?.message || error.message;
    console.error(`❌ Error fetching Mediastack API (Status: ${status}): ${message}`);
    logger.error(`❌ Mediastack API error for "${topic}" (Status: ${status}): ${message}`);
    return [];
  }
}

// --- Service 7: ScrapingDog Google News API ---
async function fetchScrapingDogGoogleNews(topic) {
  const apiUrl = "https://api.scrapingdog.com/google_news";
  const params = {
    api_key: SCRAPINGDOG_API_KEY,
    query: topic || "latest news",
    results: 10,
    country: "us",
    language: "en",
    safe: "off",
    html: false
  };

  try {
    const response = await axios.get(apiUrl, { params });
    const statusCode = response.status;
    const data = response.data || {};
    const articles = data.news_results || [];

    console.log(`📰 ScrapingDog Google News articles fetched: ${articles.length} (Status: ${statusCode})`);
    logger.info(`📰 ScrapingDog Google News articles fetched for "${topic}": ${articles.length} (Status: ${statusCode})`);

    return articles.map(article => ({
      title: article.title || '',
      author: article.source || '',
      publishedAt: article.date || '',
      description: article.snippet || '',
      url: article.link || '',
      publicationId: ''
    }));
  } catch (error) {
    const status = error.response?.status ?? '0';
    const message = error.response?.data?.message || error.message;
    console.error(`❌ Error fetching ScrapingDog Google News (Status: ${status}): ${message}`);
    logger.error(`❌ Error fetching ScrapingDog Google News for "${topic}" (Status: ${status}): ${message}`);
    return [];
  }
}




// --- Exported ---
function isGNewsQuotaExceeded() {
  return gnewsQuotaExceeded;
}

module.exports = {
  fetchNewsDataIO,
  fetchTheNewsAPI,
  fetchNewsAPIOrg,
  fetchGNewsIO,
  fetchCurrentsAPI,
  fetchMediastackAPI,
  fetchScrapingDogGoogleNews, // ✅ new
  isGNewsQuotaExceeded
};

