import { DatabaseHelper } from '../database/databaseHelper.js';
import { NavigationHelper } from '../navigation/navigationHelper.js';
import { parentPort, workerData } from "worker_threads";

async function visitPopularSites() {

    const database = new DatabaseHelper(workerData.mongoURI);
    await database.initializeConnectionAndOpenDatabase(workerData.databaseName);

    const cursor = await database.getAllCollectionValues(workerData.popularSiteCollectionName);

    const navigation = new NavigationHelper();

    while (await cursor.hasNext()) {
        try {
            const site = await cursor.next();
            const siteVisit = await navigation.visitPageAndInterceptURLs(site.domainAddress);
            if (siteVisit.cookies) {
                await database.updateSiteCookies(workerData.popularSiteCollectionName,site,siteVisit.cookies);
            }

            if (siteVisit.localStorage) {
                await database.updateSiteLocalStorage(workerData.popularSiteCollectionName,site,siteVisit.localStorage);
            }

            for (const requestFromSite of siteVisit.requests) {
                const trackersResult = await database.upsertTrackerToDatabse(workerData.trackerCollectionName,site,requestFromSite);
            }
        } catch (error) {
            console.error(error);
        }
    }

    parentPort.postMessage({
        siteVisitTime: new Date()
    });
    return workerData.visitPopularSiteIntervalDays;
}

const visitPopularSiteIntervalDays = await visitPopularSites();

const visitIntervalMilliseconds = 24*60*60*1000*visitPopularSiteIntervalDays;
setInterval(() => {visitPopularSites();}, visitIntervalMilliseconds);
