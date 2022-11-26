import  http from 'http';
import { MostPopularSiteHelper } from './modules/sites/mostPopularSiteHelper.js';
import { DatabaseHelper } from './modules/database/databaseHelper.js';

const hostname = '127.0.0.1';
const port = 3000;
const mongoURI = 'mongodb://127.0.0.1:27017/';
const popularSiteListURL = 'https://trends.netcraft.com/topsites?c=LV';

const sites = [];

const database = new DatabaseHelper(mongoURI);
await database.initializeConnectionAndOpenDatabase('latvianTrackers');

const siteHelper = new MostPopularSiteHelper(popularSiteListURL);

const siteObjectArray = await siteHelper.getSiteObjectArray();

for (const site of siteObjectArray) {
  const result = await database.upsertSiteToDatabase('latvianTrackers',site);
  console.log(result);
}

await database.closeConnection();

// const server = http.createServer((req, res) => {
//   res.statusCode = 200;
//   res.setHeader('Content-Type', 'text/plain');
//   res.write('element');
//   res.end();
// });

// server.listen(port, hostname, () => {
//   console.log(`Server running at http://${hostname}:${port}/`);
// });