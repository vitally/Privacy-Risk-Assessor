import dns from 'dns';
import util from 'util';

const resolveCnameAsync = util.promisify(dns.resolveCname);

export { AnalyticsHelper };

class AnalyticsHelper {
  constructor(siteVisit) {
    this._siteVisit = siteVisit;
    this._totalRequestCount = this.isIterable(siteVisit.requests) ? siteVisit.requests.length : 0;
    this._thirdPartyDomainsAddressed = this.getThirdPartyDomainsAddressed();
    this._thirdPartyRequestFraction = this._totalRequestCount > 0 ? this._thirdPartyDomainsAddressed.length / this._totalRequestCount : -1;
    if (this._thirdPartyDomainsAddressed.length > 0) {
      this._thirdPartyRequestStats = this.getThirdPartyRequestStats(this._thirdPartyDomainsAddressed);
    }
    this._framesReferringToThirdPartyDomains = this.getFramesReferringToThirdPartyDomains();
    if (this._framesReferringToThirdPartyDomains.length > 0) {
      this._thirdPartyFrameStats = this.getThirdPartyRequestStats(this._framesReferringToThirdPartyDomains);
    }

    const siteCookieCount = siteVisit.cookies ? siteVisit.cookies.length : 0;
    const requestCookieCount = this._totalRequestCount > 0 ? this.getCookiesSetByRequests(siteVisit.requests).length : 0;

    this._totalCookieCount = siteCookieCount + requestCookieCount;
    this._cookiesSetByThirdPartyRequests = this.getCookiesSetByRequests(this._thirdPartyDomainsAddressed);
    this._thirdPartyCookieFraction = this._totalCookieCount > 0 ? this._cookiesSetByThirdPartyRequests.length / this._totalCookieCount : -1;
    this._cookiesInDisguise = this.getCookiesInDisguise();

    if (this._cookiesSetByThirdPartyRequests.length) {
      this._thirdPartyCookieStats = this.getThirdPartyRequestStats(this._cookiesSetByThirdPartyRequests);
    }
    this._ownerWithProperName = this.getMeaningfulOwnerName();
  }
  
  _trackingCookies = [
    "_ga",         // Google Analytics
    "_gid",        // Google Analytics
    "_fbp",        // Facebook Pixel
    "_gcl_au",     // Google AdSense
    "_uetsid",     // Microsoft Bing Ads
    "IDE",         // Google DoubleClick
    "fr",          // Facebook
    "_cfduid",     // Cloudflare
    "_ym_uid",     // Yandex Metrica
    "_hjid"        // Hotjar
  ];

  isIterable(obj) {
    // checks for null and undefined
    if (obj == null) {
      return false;
    }
    return typeof obj[Symbol.iterator] === "function";
  }

  getCookiesFromRequest(requestFromSite, siteId, requestId) {
    if (this.isIterable(requestFromSite.cookies)) {
      return requestFromSite.cookies.map((cookie) => {
        cookie.siteId = siteId;
        cookie.requestId = requestId;
        return cookie;
      });
    }
    return [];
  }

  calculateShannonDiversityIndex(domainCounts, totalRequests) {
    let shannonIndex = 0;
    for (const domain in domainCounts) {
      let proportion = domainCounts[domain] / totalRequests;
      shannonIndex -= proportion * Math.log(proportion);
    }
    return shannonIndex;
  }

  getAllCookiesFromRequests() {
    const cookies = [];
    const requests = this._siteVisit.requests;
    if (this.isIterable(requests)) {
      for (const requestFromSite of requests) {
        const requestCookies = this.getCookiesFromRequest(
          requestFromSite,
          this._siteVisit._id,
          requestFromSite._id
        );
        cookies.push(...requestCookies);
      }
    }
    return cookies;
  }
  getAllCookies(){
    const requestCookies = this.getAllCookiesFromRequests();
    const allCookies = requestCookies.concat(this._siteVisit.cookies ? this._siteVisit.cookies : []);
    return allCookies;
  }

  getCookiesInDisguise(){
    const allCookies = this.getAllCookies();
    const disguiseCookies = allCookies.filter(cookie => { 
      const cookieDomainName = cookie.domain ? cookie.domain : cookie.domainName;
      return this._trackingCookies.includes(cookie.name.toLowerCase()) && cookieDomainName.endsWith(this._siteVisit.domainName);
    } );
    return disguiseCookies;
  }

  async getReauestsWithCnameRedirects() {
    const visit = this._siteVisit;
    if (this.isIterable(visit.requests)) {
      const requestsWithCname = await Promise.all(visit.requests.map(async (request) => {
        const domain = new URL(request.fullUrl).hostname;
        try {
          const addresses = await resolveCnameAsync(domain);
          if (addresses && addresses.length > 0) {
            return { ...request, cnameRedirects: addresses }; // Add the CNAME redirections to the request object
          }
        } catch (err) {
          // Handle errors or no CNAME found by returning null or similar
          return null;
        }
      }));

      // Filter out nulls (where no CNAME redirection was detected) and return
      const identifiedRequestsWithCname = requestsWithCname.filter(request => request !== null);
      const requestsWithCnameAndCookies = identifiedRequestsWithCname.filter(request => request.cookies && request.cookies.length > 0);
      return {all : identifiedRequestsWithCname, withCookies: requestsWithCnameAndCookies};
    }
    return [];
  }

  // Helper method to check if an object is iterable
  isIterable(obj) {
    return obj != null && typeof obj[Symbol.iterator] === 'function';
  }

  getThirdPartyDomainsAddressed() {
    const visit = this._siteVisit;
    if (this.isIterable(visit.requests)) {
      return visit.requests.filter(
        (request) =>
          request.domainName !== visit.domainName &&
          !request.domainName.startsWith("data")
      );
    }
    return [];
  }

  // getRequest

  getCookiesSetByRequests(thirdPartyDomainsAddressed) {
    const requestsWithCookies = thirdPartyDomainsAddressed.filter(
      (request) => request.cookies && request.cookies.length > 0
    );
    const cookies = requestsWithCookies.reduce((acc, obj) => {
      return acc.concat(obj.cookies);
  }, []);
    return cookies;
  }

  getCookiesSetByCnameRequests(cnameDomainsAddressed) {
    if (!Array.isArray(cnameDomainsAddressed)  || cnameDomainsAddressed.length == 0) {
      return [];
    }
    const requestsWithCookies = cnameDomainsAddressed.filter(
      (request) => {
        if (request.cookies && request.cookies.length > 0) {
          // Filter cookies where cookie domain name is different from request domain name
          const firstPartyCookiesSetByCname = request.cookies.filter((cookie) => {
            // Determine the cookie domain name, considering the possibility of different property names
            const cookieDomainName = cookie.domain ? cookie.domain : cookie.domainName;
            const requestEndDomain = request.cnameRedirects && request.cnameRedirects.length > 0 ? request.cnameRedirects[0] : request.domainName;
            // Compare cookie domain name with request end domain name
            return cookieDomainName !== requestEndDomain;
          });

          // If there are any cookies after filtering, return true to include this request in the results
          return firstPartyCookiesSetByCname.length > 0;
        }
        return false; // If no cookies or no cookies match the condition, return false to exclude this request
      }
    );

    // Reduce the filtered requests to a flat array of cookies
    const cookies = requestsWithCookies.reduce((acc, obj) => {
      return acc.concat(obj.cookies);
    }, []);

    return cookies;
}


  getFramesReferringToThirdPartyDomains() {
    const siteVisit = this._siteVisit;
    return siteVisit.frames ? siteVisit.frames.filter(
      (frame) => frame.domainName && frame.domainName !== siteVisit.domainName
    ) : [];
  }

  getMeaningfulOwnerName() {
    const siteVisit = this._siteVisit;
    let siteOwnerName = siteVisit.owner?.name;
    siteOwnerName = siteOwnerName ? siteOwnerName.toLowerCase() : null;
    if (
      siteOwnerName &&
      siteOwnerName.indexOf("gdpr") === -1 &&
      siteOwnerName.indexOf("masked") === -1 &&
      siteOwnerName.indexOf("privacy") === -1
    ) {
      return siteVisit.owner;
    }
    return null;
  }

  caluclateStats(counts){
      const detailedStats = {};
      detailedStats.counts = counts;
      detailedStats.totalCount = this.calculateTotal(counts);
      if (detailedStats.totalCount > 0) {
        detailedStats.mean = this.calculateMean(counts);
        detailedStats.median = this.calculateMedian(counts);
        detailedStats.standardDeviation = this.calculateStandardDeviation(counts);
        detailedStats.normalizedCounts = this.normalizeDomainCounts(counts);
        detailedStats.normalizedMean = this.calculateMean(detailedStats.normalizedCounts);
        detailedStats.normalizedMedian = this.calculateMedian(detailedStats.normalizedCounts);
        detailedStats.normalizedStandardDeviation = this.calculateStandardDeviation(detailedStats.normalizedCounts);
        detailedStats.shannonDiversityIndex = this.calculateShannonDiversityIndex(counts, detailedStats.totalCount); 
        return detailedStats;
      }
      return null;
  }

  getThirdPartyRequestStats(thirdPartyDomainsAddressed) {
    const stats = {}
    if(Object.keys(thirdPartyDomainsAddressed).length > 0){
      const domainCounts = thirdPartyDomainsAddressed.reduce((acc, obj) => {
        acc[obj.domainName] = (acc[obj.domainName] || 0) + 1;
        return acc;
      }, {});
      stats.domains = this.caluclateStats(domainCounts);
      const executionTimes = thirdPartyDomainsAddressed.reduce((acc, obj) => {
        acc[obj.domainName] = (acc[obj.domainName] || 0) + obj.executionTime || 0;
        return acc;
      }, {});
      stats.executionTimesInMilliseconds = this.caluclateStats(executionTimes);
      const expirationsInDays = thirdPartyDomainsAddressed.reduce((acc, obj) => {
        acc[obj.domainName] = (acc[obj.domainName] || 0) + obj.expiresInDays || 0;
        return acc;
      }, {});
      stats.expirationsInDays = this.caluclateStats(expirationsInDays);
    }
    return stats;
  }

  normalizeDomainCounts(domainCounts) {
    // Find the maximum number of third-party domains
    const maxCount = Math.max(...Object.values(domainCounts));

    // Normalize each count by dividing by the maximum count
    const normalizedCounts = {};
    for (const domain in domainCounts) {
      normalizedCounts[domain] = domainCounts[domain] / maxCount;
    }

    return normalizedCounts;
  }

  extractCounts(counts) {
    return Object.values(counts);
  }

  calculateTotal(counts){
    return this.extractCounts(counts).reduce((acc, count) => acc + count, 0);
  }

  calculateMean(counts) {
      const countsArray = this.extractCounts(counts);
      const total = countsArray.reduce((acc, count) => acc + count, 0);
      return total / countsArray.length;
  }

  calculateMedian(counts) {
      const countsArray = this.extractCounts(counts).sort((a, b) => a - b);
      const middleIndex = Math.floor(countsArray.length / 2);

      if (countsArray.length % 2 === 0) {
          return (countsArray[middleIndex - 1] + countsArray[middleIndex]) / 2;
      } else {
          return countsArray[middleIndex];
      }
  }

  calculateStandardDeviation(counts) {
      const countsArray = this.extractCounts(counts);
      const mean = this.calculateMean(counts);
      const squareDiffs = countsArray.map(count => {
          const diff = count - mean;
          return diff * diff;
      });

      const avgSquareDiff = this.calculateMean(squareDiffs);
      return Math.sqrt(avgSquareDiff);
  }

  get thirdPartyDomainsAddressed() {
    return {domains: this._thirdPartyDomainsAddressed, stats: this._thirdPartyRequestStats};
  }

  get cookiesSetByThirdPartyRequests() {
    return {domains: this._cookiesSetByThirdPartyRequests, stats: this._thirdPartyCookieStats};
  }

  get framesReferringToThirdPartyDomains() {
    return {domains: this._framesReferringToThirdPartyDomains, stats: this._thirdPartyFrameStats};
  }

  get domainTransparency() {
    return this._ownerWithProperName ? 0 : 1;
  }

  get totalRequestCount(){
   return this._totalRequestCount;
  }

  get thirdPartyRequestCount(){
    return this._thirdPartyDomainsAddressed.length;
  }

  get thirdPartyRequestFraction(){
    return this._thirdPartyRequestFraction; 
  }

  get totalCookieCount(){
    return this._totalCookieCount;
  }

  get thirdPartyCookieCount(){
    return this._cookiesSetByThirdPartyRequests.length;
  }

  get thirdPartyCookieFraction(){
    return this._thirdPartyCookieFraction;
  }

  get cookieInDisguiseCount(){
    return this._cookiesInDisguise.length;
  }

}
