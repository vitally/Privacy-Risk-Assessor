export { MostPopularSiteHelper };

class MostPopularSiteHelper{

  constructor(urlToGetTheSiteListFrom){
    this.siteListUrl = urlToGetTheSiteListFrom;
  }
  
  async getSiteObjectArray() {
    const tableCellRegExp = /<td><a href=["'].*["']>http[s]?:\/\/[a-zA-Z0-9\-\.]+[a-zA-Z]+<\/a><\/td>/g;
    const urlRegExp = /http[s]?:\/\/[a-zA-Z0-9\-\.]+[a-zA-Z]+/g;
    const mostPopularSitesSet = new Set();
    let tableResultArray;
    let siteResultArray;
    let siteObjectArray = [];
    const response = await fetch(this.siteListUrl);
    const responseText = await response.text();
    
    while ((tableResultArray = tableCellRegExp.exec(responseText)) !== null) {
      while ((siteResultArray = urlRegExp.exec(tableResultArray[0])) !== null) {
        mostPopularSitesSet.add(siteResultArray[0]);
      }
    }
    for (const popularSite of mostPopularSitesSet.values()) {
      const siteObject = this.constructSiteObject(popularSite);
      siteObjectArray.push(siteObject);
    }
    return siteObjectArray;
  }

  constructSiteObject(siteURL){
    return {
      domainAddress : siteURL,
      visitDate : new Date(),
      scheme: siteURL.substring(0,siteURL.indexOf(':')),
      fullAddress: ''
    };
  }
} 