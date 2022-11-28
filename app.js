import  http from 'http';
import { MostPopularSiteHelper } from './modules/sites/mostPopularSiteHelper.js';
import { DatabaseHelper } from './modules/database/databaseHelper.js';
import { NavigationHelper } from './modules/navigation/navigationHelper.js';

const hostname = '127.0.0.1';
const port = 3000;
const mongoURI = 'mongodb://127.0.0.1:27017/';
const popularSiteListURL = 'https://trends.netcraft.com/topsites?c=LV';

const database = new DatabaseHelper(mongoURI);
await database.initializeConnectionAndOpenDatabase('latvianTrackers');

const siteHelper = new MostPopularSiteHelper(popularSiteListURL);

const siteObjectArray = await siteHelper.getSiteObjectArray();

for (const site of siteObjectArray) {
  const result = await database.upsertSiteToDatabase('latvianTrackers',site);
  // console.log(result);
}

const cursor = await database.getAllCollectionValues('latvianTrackers');

const sites = await cursor.toArray();

const navigation = new NavigationHelper();

for (const site of sites) {
  const requests = await navigation.visitPageAndInterceptURLs(site.domainAddress);
  console.log(site.domainAddress + ': ' + requests.length);
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