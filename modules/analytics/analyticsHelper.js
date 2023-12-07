export { AnalyticsHelper };

class AnalyticsHelper {
  constructor(siteVisit) {
    this._siteVisit = siteVisit;
    this._thirdPartyDomainsAddressed = this.getThirdPartyDomainsAddressed(siteVisit);
    if (this._thirdPartyDomainsAddressed.length > 0) {
      this._thirdPartyRequestStats = this.getThirdPartyRequestStats(this._thirdPartyDomainsAddressed);
    }
    this._framesReferringToThirdPartyDomains = this.getFramesReferringToThirdPartyDomains(siteVisit);
    if (this._framesReferringToThirdPartyDomains > 0) {
      this._thirdPartyFrameStats = this.getThirdPartyRequestStats(this._framesReferringToThirdPartyDomains);
    }
    this._cookiesSetByThirdPartyRequests = this.getCookiesSetByThirdPartyRequests(this._thirdPartyDomainsAddressed);
    if (this._cookiesSetByThirdPartyRequests) {
      this._thirdPartyCookieStats = this.getThirdPartyRequestStats(this._cookiesSetByThirdPartyRequests);
    }
    this._ownerWithProperName = this.getMeaningfulOwnerName(siteVisit);
  }

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

  getAllCookiesFromRequests(siteVisit) {
    const cookies = [];
    const requests = siteVisit.requests;
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

  getThirdPartyDomainsAddressed(visit) {
    if (this.isIterable(visit.requests)) {
      return visit.requests.filter(
        (request) =>
          request.domainName !== visit.domainName &&
          !request.domainName.startsWith("data")
      );
    }
    return [];
  }
  getCookiesSetByThirdPartyRequests(thirdPartyDomainsAddressed) {
    return thirdPartyDomainsAddressed.filter(
      (request) => request.cookies && request.cookies.length > 0
    );
  }

  getFramesReferringToThirdPartyDomains(siteVisit) {
    return siteVisit.frames?.filter(
      (frame) => frame.domainName && frame.domainName !== siteVisit.domainName
    );
  }

  getMeaningfulOwnerName(siteVisit) {
    let siteOwnerName = siteVisit.owner?.name;
    siteOwnerName = siteOwnerName ? siteOwnerName.toLowerCase() : null;
    if (
      siteOwnerName &&
      siteOwnerName.indexOf("gdpr") === -1 &&
      siteOwnerName.indexOf("masked")
    ) {
      return siteVisit.owner;
    }
    return null;
  }

  caluclateStats(counts){
      const detailedStats = {};
      detailedStats.counts = counts;
      detailedStats.mean = this.calculateMean(counts);
      detailedStats.median = this.calculateMedian(counts);
      detailedStats.standardDeviation = this.calculateStandardDeviation(counts);
      detailedStats.normalizedCounts = this.normalizeDomainCounts(counts);
      detailedStats.normalizedMean = this.calculateMean(detailedStats.normalizedCounts);
      detailedStats.medianNormalizedMedian = this.calculateMedian(detailedStats.normalizedCounts);
      detailedStats.normalizedStandardDeviation = this.calculateStandardDeviation(detailedStats.normalizedCounts);
      return detailedStats;
  }

  getThirdPartyRequestStats(thirdPartyDomainsAddressed) {
    const stats = {}
    if(Object.keys(thirdPartyDomainsAddressed).length > 0){
      const requestCounts = thirdPartyDomainsAddressed.reduce((acc, obj) => {
        acc[obj.domainName] = (acc[obj.domainName] || 0) + 1;
        return acc;
      }, {});
      stats.requests = this.caluclateStats(requestCounts);
      const executionTimes = thirdPartyDomainsAddressed.reduce((acc, obj) => {
        acc[obj.domainName] = (acc[obj.domainName] || 0) + obj.executionTime || 0;
        return acc;
      }, {});
      stats.executionTimes = this.caluclateStats(executionTimes);
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

  extractCounts(requestCounts) {
    return Object.values(requestCounts);
  }

  calculateMean(requestCounts) {
      const countsArray = this.extractCounts(requestCounts);
      const total = countsArray.reduce((acc, count) => acc + count, 0);
      return total / countsArray.length;
  }

  calculateMedian(requestCounts) {
      const countsArray = this.extractCounts(requestCounts).sort((a, b) => a - b);
      const middleIndex = Math.floor(countsArray.length / 2);

      if (countsArray.length % 2 === 0) {
          return (countsArray[middleIndex - 1] + countsArray[middleIndex]) / 2;
      } else {
          return countsArray[middleIndex];
      }
  }

  calculateStandardDeviation(requestCounts) {
      const countsArray = this.extractCounts(requestCounts);
      const mean = this.calculateMean(requestCounts);
      const squareDiffs = countsArray.map(count => {
          const diff = count - mean;
          return diff * diff;
      });

      const avgSquareDiff = this.calculateMean(squareDiffs);
      return Math.sqrt(avgSquareDiff);
  }

  get thirdPartyDomainsAddressedScore() {
    return this._thirdPartyDomainsAddressed.length;
  }

  get cookiesSetByThirdPartyRequestsScore() {
    return this._cookiesSetByThirdPartyRequests.length;
  }

  get framesReferringToThirdPartyDomainsScore() {
    return this._framesReferringToThirdPartyDomains.length;
  }

  get domainTransparencyScore() {
    return this._ownerWithProperName ? 0 : 1;
  }

  get trackerDiversityScore() {
    return this.calculateShannonDiversityIndex(
      this.__thirdPartyRequestCounts,
      this._thirdPartyDomainsAddressed.length
    );
  }
}
