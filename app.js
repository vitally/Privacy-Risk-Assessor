import  http from 'http';
import { getMostPopularSitesSet } from './modules/sites/mostPopularSites.js';
import { DatabaseHelper } from './modules/database/databaseHelper.js';

const hostname = '127.0.0.1';
const port = 3000;
const mongoURI = 'mongodb://127.0.0.1:27017/';

const sites = [];

const database = new DatabaseHelper(mongoURI);
await database.initializeConnectionAndOpenDatabase('latvianTrackers');

getMostPopularSitesSet('https://trends.netcraft.com/topsites?c=LV')
  .then( popularSiteSet => {
    for (const popularSite in popularSiteSet) {
      if (Object.hasOwnProperty.call(popularSiteSet, popularSite)) {
        const siteURL = popularSiteSet[popularSite];
        const siteObject = {
          domainAddress : siteURL,
          visitDate : new Date(),
          scheme: siteURL.substring(0,siteURL.indexOf(':')),
          fullAddress: ''
        };
        sites.push[siteObject];
      }
    }
  })
  .catch( err => {
    console.error(err);
  });

//mostPopularLatvianSites


await database.listDatabases();
await database.closeConnection();

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  
  getMostPopularSitesSet('https://trends.netcraft.com/topsites?c=LV')
    .then( popularSiteSet => {
      for (const popularSite in popularSiteSet) {
        if (Object.hasOwnProperty.call(popularSiteSet, popularSite)) {
          const element = popularSiteSet[popularSite];
          res.write(element);
          res.end();
        }
      }
    })
    .catch( err => {
      res.write(err);
      res.end();
    });


});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});