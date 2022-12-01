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
  await database.upsertSiteToDatabase('popularSites',site);
}

const cursor = await database.getAllCollectionValues('popularSites');

const navigation = new NavigationHelper();

while (await cursor.hasNext()) {
  try {
    const site = await cursor.next();
    const siteVisit = await navigation.visitPageAndInterceptURLs(site.domainAddress);
    
    if (siteVisit.cookies) {
      await database.updateSiteCookies('popularSites',site,siteVisit.cookies);
    }

    if (siteVisit.localStorage) {
      await database.updateSiteLocalStorage('popularSites',site,siteVisit.localStorage);
    }

    for (const requestFromSite of siteVisit.requests) {
      const trackersResult = await database.upsertTrackerToDatabse('trackersOnSites',site,requestFromSite);
    }
  } catch (error) {
    console.error(error);
  }
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