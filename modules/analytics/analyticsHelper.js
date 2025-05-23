import dns from 'dns';
import util from 'util';
import { isIterable } from '../utils/commonHelpers.js'; // Import isIterable

const resolveCnameAsync = util.promisify(dns.resolveCname);

export { AnalyticsHelper };

class AnalyticsHelper {
  constructor(siteVisit) {
    this._siteVisit = siteVisit;
    this._totalRequestCount = isIterable(siteVisit.requests) ? siteVisit.requests.length : 0; // Corrected
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

  getCookiesFromRequest(requestFromSite, siteId, requestId) {
    if (isIterable(requestFromSite.cookies)) { // Corrected
      return requestFromSite.cookies.map((cookie) => {
        cookie.siteId = siteId;
        cookie.requestId = requestId;
        return cookie;
      });
    }
    return [];
  }

  /**
   * Calculates the Shannon Diversity Index for a given set of domain counts.
   * The Shannon Diversity Index is a measure of diversity in a dataset.
   * @param {object} domainCounts - An object where keys are domain names and values are their counts.
   * @param {number} totalRequests - The total number of requests/items.
   * @returns {number} The Shannon Diversity Index. Returns 0 if totalRequests is 0.
   */
  calculateShannonDiversityIndex(domainCounts, totalRequests) {
    if (totalRequests === 0) {
      return 0; 
    }
    let shannonIndex = 0;
    for (const domain in domainCounts) {
      let proportion = domainCounts[domain] / totalRequests;
      if (proportion > 0) {
        shannonIndex -= proportion * Math.log(proportion);
      }
    }
    return shannonIndex;
  }

  getAllCookiesFromRequests() {
    const cookies = [];
    const requests = this._siteVisit.requests;
    if (isIterable(requests)) { // Corrected
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
    const siteCookies = this._siteVisit.cookies || [];
    const requestCookies = this.getAllCookiesFromRequests();
    return [...siteCookies, ...requestCookies];
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
    if (!isIterable(visit.requests)) { // Corrected
      return { all: [], withCookies: [] }; 
    }

    const requestsWithCnamePromises = visit.requests.map(async (request) => {
      const domain = new URL(request.fullUrl).hostname;
      try {
        const cnameAliases = await resolveCnameAsync(domain);
        if (cnameAliases && cnameAliases.length > 0) {
          return { ...request, cnameRedirects: cnameAliases };
        }
      } catch (err) {
        return null; 
      }
      return null; 
    });

    const resolvedRequests = await Promise.all(requestsWithCnamePromises);
    const requestsWithCnameData = resolvedRequests.filter(request => request !== null);
    const requestsWithCnameDataAndCookies = requestsWithCnameData.filter(request => request.cookies && request.cookies.length > 0);
    
    return { all: requestsWithCnameData, withCookies: requestsWithCnameDataAndCookies };
  }

  getThirdPartyDomainsAddressed() {
    const visit = this._siteVisit;
    if (isIterable(visit.requests)) { // Corrected
      return visit.requests.filter(
        (request) =>
          request.domainName !== visit.domainName &&
          !request.domainName.startsWith("data")
      );
    }
    return [];
  }

  getCookiesSetByRequests(thirdPartyDomainsAddressed) {
    const requestsWithCookies = thirdPartyDomainsAddressed.filter(
      (request) => request.cookies && request.cookies.length > 0
    );
    const cookies = requestsWithCookies.reduce((acc, obj) => {
      return acc.concat(obj.cookies);
  }, []);
    return cookies;
  }

  _isCookieDomainDifferentFromRequestEffectiveDomain(cookie, request) {
    const cookieDomainName = cookie.domain || cookie.domainName;
    const requestEffectiveDomain = (request.cnameRedirects && request.cnameRedirects.length > 0)
                                 ? request.cnameRedirects[0]
                                 : request.domainName;
    return cookieDomainName !== requestEffectiveDomain;
  }

  getCookiesSetByCnameRequests(cnameDomainsAddressed) {
    if (!Array.isArray(cnameDomainsAddressed) || cnameDomainsAddressed.length === 0) {
      return [];
    }
    const requestsWithRelevantCookies = cnameDomainsAddressed.filter(request => {
      if (!request.cookies || request.cookies.length === 0) {
        return false; 
      }
      return request.cookies.some(cookie => this._isCookieDomainDifferentFromRequestEffectiveDomain(cookie, request));
    });
    const cookies = requestsWithRelevantCookies.reduce((acc, req) => {
      return acc.concat(req.cookies);
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
      siteOwnerName.indexOf("privacy") === -1 &&
      siteOwnerName.indexOf("protection") === -1
    ) {
      return siteVisit.owner;
    }
    return null;
  }

  _calculateStatsSummary(counts){ 
      if (!counts || Object.keys(counts).length === 0) { 
        return null;
      }
      const detailedStats = {};
      detailedStats.counts = counts;
      detailedStats.totalCount = this.calculateTotal(counts);

      if (detailedStats.totalCount > 0) {
        detailedStats.mean = this.calculateMean(counts);
        detailedStats.median = this.calculateMedian(counts);
        detailedStats.standardDeviation = this.calculateStandardDeviation(counts);
        detailedStats.normalizedCounts = this._normalizeDomainCounts(counts); 
        detailedStats.normalizedMean = this.calculateMean(detailedStats.normalizedCounts);
        detailedStats.normalizedMedian = this.calculateMedian(detailedStats.normalizedCounts);
        detailedStats.normalizedStandardDeviation = this.calculateStandardDeviation(detailedStats.normalizedCounts);
        detailedStats.shannonDiversityIndex = this.calculateShannonDiversityIndex(counts, detailedStats.totalCount); 
        return detailedStats;
      }
      return null; 
  }
  
  _calculateDomainCounts(items) {
    return items.reduce((acc, obj) => {
      const key = obj.domainName || 'unknown_domain';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  _calculateExecutionTimes(items) {
    return items.reduce((acc, obj) => {
      const key = obj.domainName || 'unknown_domain';
      acc[key] = (acc[key] || 0) + (obj.executionTime || 0);
      return acc;
    }, {});
  }

  _calculateExpirationDays(items) {
    return items.reduce((acc, obj) => {
      const key = obj.domainName || 'unknown_domain'; 
      acc[key] = (acc[key] || 0) + (obj.expiresInDays || 0);
      return acc;
    }, {});
  }

  getThirdPartyRequestStats(thirdPartyItems) { 
    const stats = {};
    if (!Array.isArray(thirdPartyItems) || thirdPartyItems.length === 0) {
        return stats; 
    }

    const domainCounts = this._calculateDomainCounts(thirdPartyItems);
    stats.domains = this._calculateStatsSummary(domainCounts);

    if (thirdPartyItems.some(item => typeof item.executionTime !== 'undefined')) {
        const executionTimes = this._calculateExecutionTimes(thirdPartyItems);
        stats.executionTimesInMilliseconds = this._calculateStatsSummary(executionTimes);
    }
    
    if (thirdPartyItems.some(item => typeof item.expiresInDays !== 'undefined')) {
        const expirationsInDays = this._calculateExpirationDays(thirdPartyItems);
        stats.expirationsInDays = this._calculateStatsSummary(expirationsInDays);
    }
    
    return stats;
  }

  _normalizeDomainCounts(domainCounts) { 
    const maxCount = Math.max(...Object.values(domainCounts));
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
      if (countsArray.length === 0) return 0; 
      const total = countsArray.reduce((acc, count) => acc + count, 0);
      return total / countsArray.length;
  }

  calculateMedian(counts) {
      const countsArray = this.extractCounts(counts).sort((a, b) => a - b);
      if (countsArray.length === 0) return 0;
      const middleIndex = Math.floor(countsArray.length / 2);

      if (countsArray.length % 2 === 0) {
          return (countsArray[middleIndex - 1] + countsArray[middleIndex]) / 2;
      } else {
          return countsArray[middleIndex];
      }
  }

  calculateStandardDeviation(counts) {
      const countsArray = this.extractCounts(counts);
      if (countsArray.length === 0) return 0;
      const mean = this.calculateMean(counts);
      const squareDiffs = countsArray.map(count => {
          const diff = count - mean;
          return diff * diff;
      });
      const variance = this.calculateMean(squareDiffs); 
      return Math.sqrt(variance);
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
