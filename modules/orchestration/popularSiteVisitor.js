import { DatabaseHelper } from "../database/databaseHelper.js";
import { NavigationHelper } from "../navigation/navigationHelper.js";
import { AnalyticsHelper } from "../analytics/analyticsHelper.js";
import { parentPort, workerData } from "worker_threads";
import moment from "moment";


class Queue {
  constructor() {
      this.items = [];
      this.processing = false;
  }

  enqueue(item) {
      this.items.push(item);
      console.log(`[${moment().format("DD.MM.YYYY HH:MM:SS")}] Queued ${item.domainAddress}. Queue size: '${this.items.length}'`);
      this.processNext();
  }

  async processNext() {
      if (this.processing || this.items.length === 0) return;
      this.processing = true;
      const message = this.items.shift();
      try {
          console.log(`[${moment().format("DD.MM.YYYY HH:MM:SS")}] Processing ${message.domainAddress}. Queue size: '${this.items.length}'`);
          const data = await visitOneSite(message);
          if (data?.ok == 1) {
            console.log(`[${moment().format("DD.MM.YYYY HH:MM:SS")}] Finished processing ${message.domainAddress}.`);
          } else {
            console.log(`[${moment().format("DD.MM.YYYY HH:MM:SS")}] Failed processing ${message.domainAddress}.`);
          }
          parentPort.postMessage(data);
      } catch (error) {
          console.error(error);
      } finally {
          this.processing = false;
          this.processNext();
      }
  }
}

const queue = new Queue();

function isIterable(obj) {
  // checks for null and undefined
  if (obj == null) { 
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}

async function upsertRequestsAndReturnIds(database, siteVisit){
  if (isIterable(siteVisit.requests)) {
    for (const requestFromSite of siteVisit.requests) {
      const upsertResult = await database.upsertTrackerToDatabse( workerData.trackerCollectionName, siteVisit, requestFromSite );
      if (upsertResult.value?._id) {
        requestFromSite._id = upsertResult.value?._id;
      }
    }
  }
  return siteVisit;
}

async function visitOneSite(site) {
  const navigation = new NavigationHelper();
  const database = new DatabaseHelper(workerData.mongoURI);
  await database.initializeConnectionAndOpenDatabase(workerData.databaseName);

  if (site.domainAddress) {
    try {
      const siteVisit = await navigation.visitPageAndInterceptURLs(site.domainAddress);
      siteVisit.owner = site.owner;
      site.accessible = siteVisit.accessible;
      site.error = siteVisit.error;
      const upsertResult = await database.upsertSiteToDatabase(workerData.popularSiteCollectionName,site);
      siteVisit._id = upsertResult.value?._id;
      
      if (siteVisit.cookies) {
          await database.updateSiteCookies( workerData.popularSiteCollectionName, siteVisit );
      }
        
      if (siteVisit.localStorage) {
        await database.updateSiteLocalStorage( workerData.popularSiteCollectionName, siteVisit );
      }
      
      if (siteVisit.frames) {
        await database.updateSiteFrames( workerData.popularSiteCollectionName, siteVisit );
      }
      
      if (siteVisit.canvasFingerprintingDetected) {
        await database.setSiteCanvasFingerprinting( workerData.popularSiteCollectionName, siteVisit);
      }
      
      
      await upsertRequestsAndReturnIds(database,siteVisit);
      
      const analyticsHelper = new AnalyticsHelper(siteVisit);

      const cnameRequests = await analyticsHelper.getReauestsWithCnameRedirects();
      const cookiesSetByCname = analyticsHelper.getCookiesSetByCnameRequests(cnameRequests.withCookies);

      const cookies = [];
      cookies.push(... analyticsHelper.getAllCookiesFromRequests());

      if (cookies.length > 0) {
        await database.upsertCookiesToDatabse(workerData.siteCookiesCollectionName, cookies);
      }

      siteVisit.thirdPartyDomainsAddressed = analyticsHelper.thirdPartyDomainsAddressed;
      siteVisit.cookiesSetByThirdPartyRequests = analyticsHelper.cookiesSetByThirdPartyRequests;
      siteVisit.framesReferringToThirdPartyDomains = analyticsHelper.framesReferringToThirdPartyDomains;
      siteVisit.ownerWithProperName = analyticsHelper.domainTransparency;
      siteVisit.totalRequestCount = analyticsHelper.totalRequestCount;
      siteVisit.thirdPartyRequestCount = analyticsHelper.thirdPartyRequestCount;
      siteVisit.thirdPartyRequestFraction = analyticsHelper.thirdPartyRequestFraction;
      siteVisit.totalCookieCount = analyticsHelper.totalCookieCount;
      siteVisit.thirdPartyCookieCount = analyticsHelper.thirdPartyCookieCount;
      siteVisit.thirdPartyCookieFraction = analyticsHelper.thirdPartyCookieFraction;
      siteVisit.cookieInDisguiseCount = analyticsHelper.cookieInDisguiseCount;
      siteVisit.cookieSetByRequestsWithCnameRedirectCount = cookiesSetByCname.length;

      return await database.updateSiteStats( workerData.popularSiteCollectionName, siteVisit);
      // return await database.getOneSitesWithRequestsAndOwners( siteVisit._id, workerData.popularSiteCollectionName, workerData.trackerCollectionName, workerData.siteOwnersCollectionName );
    } catch (error) {
      console.error(error);
    }
  } 
}

parentPort.on("message", (message) => {
  if (message.domainAddress) {
    queue.enqueue(message);
  }
});
