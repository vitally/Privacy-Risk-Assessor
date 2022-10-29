// module "mostpopularsites.js"

function getMostPopularSitesSet() {
    fetch('https://trends.netcraft.com/topsites?c=LV')
    .then( fetchedData => fetchedData.text())
    .then( fetchedDataBody => {
      const tableCellRegExp = /<td><a href=["'].*["']>http[s]?:\/\/[a-zA-Z0-9\-\.]+[a-zA-Z]+<\/a><\/td>/g;
      const urlRegExp = /http[s]?:\/\/[a-zA-Z0-9\-\.]+[a-zA-Z]+/g;
      const mostPopularSitesSet = new Set();
      let tableResultArray;
      let siteResultArray;

      while ((tableResultArray = tableCellRegExp.exec(fetchedDataBody)) !== null) {
        while ((siteResultArray = urlRegExp.exec(tableResultArray[0])) !== null) {
          mostPopularSitesSet.add(siteResultArray[0]);
        }
      }
      return mostPopularSitesSet;
    })
    .catch(error => {
      return null;
    });
}

export { getMostPopularSitesSet };