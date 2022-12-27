import { DatabaseHelper } from '../database/databaseHelper.js';
import { NavigationHelper } from '../navigation/navigationHelper.js';
import { parentPort, workerData } from "worker_threads";
import moment from 'moment';

async function visitOneSite(site){
    const navigation = new NavigationHelper();
    const database = new DatabaseHelper(workerData.mongoURI);
    await database.initializeConnectionAndOpenDatabase(workerData.databaseName);

    try {
        const siteVisit = await navigation.visitPageAndInterceptURLs(site.domainAddress);
        if (siteVisit.cookies) {
            await database.updateSiteCookies(workerData.popularSiteCollectionName,site,siteVisit.cookies);
        }

        if (siteVisit.localStorage) {
            await database.updateSiteLocalStorage(workerData.popularSiteCollectionName,site,siteVisit.localStorage);
        }

        if (siteVisit.canvasFingerprintingDetected) {
            await database.setSiteCanvasFingerprinting(workerData.popularSiteCollectionName,site);
        }

        for (const requestFromSite of siteVisit.requests) {
            await database.upsertTrackerToDatabse(workerData.trackerCollectionName,site,requestFromSite);
        }

        return await database.getOneSitesWithRequestsAndOwners(site._id, workerData.popularSiteCollectionName, workerData.trackerCollectionName, workerData.siteOwnersCollectionName);

    } catch (error) {
        console.error(error);
    }
}

parentPort.on('message', message => {
    console.log(`[${moment().format('DD.MM.YYYY HH:MM:SS')}] Site Visitor: '${message.domainAddress}'`);
    visitOneSite(message).then(data => parentPort.postMessage(data));
});
