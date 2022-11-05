import  http from 'http';
import { getMostPopularSitesSet } from './modules/sites/mostpopularsites.js'


const hostname = '127.0.0.1';
const port = 3000;

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