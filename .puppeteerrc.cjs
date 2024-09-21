const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Changes the cache location for Puppeteer.
    // Points to origin pptruser (Docker) cache directory
    cacheDirectory: join('/home', 'pptruser', '.cache', 'puppeteer'),
};