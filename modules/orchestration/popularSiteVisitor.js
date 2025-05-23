import { DatabaseHelper } from "../database/databaseHelper.js";
import { NavigationHelper } from "../navigation/navigationHelper.js";
import { AnalyticsHelper } from "../analytics/analyticsHelper.js";
import { parentPort, workerData } from "worker_threads";
import { logInfo, logError } from '../utils/logger.js'; // Import the logger
import { isIterable } from '../utils/commonHelpers.js'; // Import isIterable


class Queue {
  constructor() {
      this.items = [];
      this.processing = false;
  }

  enqueue(item) {
      this.items.push(item);
      logInfo(`Queued ${item.domainAddress}. Queue size: '${this.items.length}'`);
      this.processNext();
  }

  async processNext() {
      if (this.processing || this.items.length === 0) return;
      this.processing = true;
      const message = this.items.shift();
      try {
          logInfo(`Processing ${message.domainAddress}. Queue size: '${this.items.length}'`);
          const data = await visitOneSite(message);
          if (data?.ok == 1) {
            logInfo(`Finished processing ${message.domainAddress}.`);
          } else {
            logInfo(`Failed processing ${message.domainAddress}.`); // Changed to logInfo as it's a status update
          }
          parentPort.postMessage(data);
      } catch (error) {
          logError(`Error processing ${message?.domainAddress}:`, error);
          // Improved error reporting to main thread
          parentPort.postMessage({ 
            error: true, 
            message: error.message, 
            stack: error.stack, 
            domainAddress: message?.domainAddress 
          });
      } finally {
          this.processing = false;
          this.processNext();
      }
  }
}

const queue = new Queue();

// Removed local isIterable function, as it's now imported.

// Helper function to upsert requests and return their IDs
async function _upsertRequestsAndReturnIds(database, siteVisit) {
  if (isIterable(siteVisit.requests)) {
    for (const requestFromSite of siteVisit.requests) {
      const upsertResult = await database.upsertTrackerToDatabse(workerData.trackerCollectionName, siteVisit, requestFromSite);
      if (upsertResult.value?._id) {
        requestFromSite._id = upsertResult.value._id;
      }
    }
  }
  return siteVisit;
}

// Helper function for navigation and initial data saving
async function _navigateAndSaveInitialSiteData(database, site, navigation) {
  const siteVisit = await navigation.visitPageAndInterceptURLs(site.domainAddress);
  siteVisit.owner = site.owner;
  site.accessible = siteVisit.accessible;
  site.error = siteVisit.error;

  const upsertResult = await database.upsertSiteToDatabase(workerData.popularSiteCollectionName, site);
  siteVisit._id = upsertResult.value?._id;

  if (!siteVisit._id) {
    throw new Error(`Failed to upsert site and get ID for ${site.domainAddress}`);
  }

  if (siteVisit.cookies) {
    await database.updateSiteCookies(workerData.popularSiteCollectionName, siteVisit);
  }
  if (siteVisit.localStorage) {
    await database.updateSiteLocalStorage(workerData.popularSiteCollectionName, siteVisit);
  }
  if (siteVisit.frames) {
    await database.updateSiteFrames(workerData.popularSiteCollectionName, siteVisit);
  }
  if (siteVisit.canvasFingerprintingDetected) {
    await database.setSiteCanvasFingerprinting(workerData.popularSiteCollectionName, siteVisit);
  }

  await _upsertRequestsAndReturnIds(database, siteVisit);
  return siteVisit;
}

// Helper function for performing analytics and upserting cookies
async function _performAnalyticsAndUpsertCookies(database, siteVisit) {
  const analyticsHelper = new AnalyticsHelper(siteVisit);
  const cnameRequests = await analyticsHelper.getReauestsWithCnameRedirects();
  const cookiesSetByCname = analyticsHelper.getCookiesSetByCnameRequests(cnameRequests.withCookies);

  const cookiesToUpsert = [];
  cookiesToUpsert.push(...analyticsHelper.getAllCookiesFromRequests());

  if (cookiesToUpsert.length > 0) {
    await database.upsertCookiesToDatabse(workerData.siteCookiesCollectionName, cookiesToUpsert);
  }
  return { analyticsHelper, cookiesSetByCnameLength: cookiesSetByCname.length };
}

// Helper function for updating site with analytics stats
async function _updateSiteWithAnalyticsStats(database, siteVisit, analyticsData) {
  const { analyticsHelper, cookiesSetByCnameLength } = analyticsData;

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
  siteVisit.cookieSetByRequestsWithCnameRedirectCount = cookiesSetByCnameLength;

  return await database.updateSiteStats(workerData.popularSiteCollectionName, siteVisit);
}

async function visitOneSite(site) {
  const navigation = new NavigationHelper();
  const database = new DatabaseHelper(workerData.mongoURI);
  
  try {
    await database.initializeConnectionAndOpenDatabase(workerData.databaseName);

    if (!site.domainAddress) {
      logInfo('visitOneSite called with no domainAddress in site object.');
      return { ok: 0, error: 'No domainAddress provided' };
    }

    const siteVisit = await _navigateAndSaveInitialSiteData(database, site, navigation);
    const analyticsData = await _performAnalyticsAndUpsertCookies(database, siteVisit);
    const result = await _updateSiteWithAnalyticsStats(database, siteVisit, analyticsData);
    
    return result;
    // return await database.getOneSitesWithRequestsAndOwners( siteVisit._id, workerData.popularSiteCollectionName, workerData.trackerCollectionName, workerData.siteOwnersCollectionName );
  } catch (error) {
    logError(`Error in visitOneSite for ${site?.domainAddress}:`, error);
    // Propagate the error so it can be caught by processNext
    throw error; 
  } finally {
    // Ensure database connection is closed even if errors occur
    if (database && database.openedDatabase) {
      await database.closeConnection().catch(err => logError(`Failed to close database connection for ${site?.domainAddress}:`, err));
    }
  }
}

parentPort.on("message", (message) => {
  if (message.domainAddress) {
    queue.enqueue(message);
  }
});
