// module "mostpopularsites.js"
export { getMostPopularSitesSet };

function getMostPopularSitesSet(statsURL) {
  return new Promise(
    (resolve, reject) => {
      fetch(statsURL)
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
        resolve( mostPopularSitesSet );
      })
      .catch(error => {
        reject( error );
      });
    }
  );
}