import { MostPopularSiteHelper } from '../sites/mostPopularSiteHelper.js';
import { DatabaseHelper } from '../database/databaseHelper.js';
import { WhoisHelper } from '../sites/whoisHelper.js';
import { parentPort, workerData } from "worker_threads";

async function retrievePopularSites() {
    const siteHelper = new MostPopularSiteHelper(workerData.popularSiteListURL);
    const siteObjectArray = await siteHelper.getSiteObjectArray();
    
    const database = new DatabaseHelper(workerData.mongoURI);
    await database.initializeConnectionAndOpenDatabase(workerData.databaseName);
    
    const whoisHelper = new WhoisHelper();

    for (const site of siteObjectArray) {
        try {
            const siteRecord = await database.upsertSiteToDatabase(workerData.popularSiteCollectionName,site);
            const whoisResponse = await whoisHelper.getWhoisInfo(site.domainAddress);
            const siteOwnerRecord = await database.upsertSiteOwnerToDatabse(workerData.siteOwnersCollectionName,whoisResponse);
            const siteOwnerRecordId = siteOwnerRecord.value ? siteOwnerRecord.value._id : siteOwnerRecord.lastErrorObject.upserted;
            await database.addSiteToOwner(workerData.siteOwnersCollectionName, siteOwnerRecordId,siteRecord.value._id);
        } catch (error) {
            console.error(error.message);
        }
    }

    await database.closeConnection();

    parentPort.postMessage({
        siteRetrievalTime: new Date()
    });

    return workerData.collectSiteDataPeriodDays;
}

const collectSiteDataPeriodDays = await retrievePopularSites();

const retreiveIntervalMilliseconds = 24*60*60*1000*collectSiteDataPeriodDays;
setInterval(() => {retrievePopularSites();}, retreiveIntervalMilliseconds);
