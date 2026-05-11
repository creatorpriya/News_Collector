# News_Collector

News_Collector is an automated company news aggregation and monitoring system built with Node.js. It collects real-time news articles from multiple news providers and Google News sources, normalizes the data, and sends structured news feeds to the Portend platform for intelligence and monitoring workflows.

The application continuously fetches company-specific news using APIs such as NewsData.io, NewsAPI.org, GNews, Currents API, Mediastack, TheNewsAPI, and ScrapingDog Google News.

## Features

* Multi-source news aggregation
* Real-time company news monitoring
* Automated article normalization
* Google News scraping support
* Portend platform integration
* Rate-limit & quota handling
* Continuous scheduled execution
* Error handling & retry support
* Structured JSON news processing
* Logging & monitoring support

## Tech Stack

* Node.js
* Axios
* News APIs
* Google News Scraping
* JSON Processing
* Winston Logger

## Supported News Sources

* NewsData.io
* TheNewsAPI
* NewsAPI.org
* GNews.io
* Currents API
* Mediastack API
* ScrapingDog Google News

## Workflow

1. Authenticate with Portend
2. Fetch company names dynamically
3. Collect news from multiple APIs
4. Normalize article structure
5. Filter invalid articles
6. Send structured news data to Portend
7. Repeat continuously on scheduled intervals

## Article Data Collected

* Title
* Author
* Published Date
* Description
* Source URL
* Publication Metadata

## Scalability

The system supports:

* Continuous background execution
* API quota management
* Multi-source failover
* Automated retries
* Large-scale company news tracking

Ideal for threat intelligence, media monitoring, company tracking, OSINT pipelines, and real-time news intelligence systems.
