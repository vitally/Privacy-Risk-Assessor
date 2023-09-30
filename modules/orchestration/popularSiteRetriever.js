import { parentPort, workerData } from "worker_threads";
import { DatabaseHelper } from '../database/databaseHelper.js';
import { MostPopularSiteHelper } from '../sites/mostPopularSiteHelper.js';
import { WhoisHelper } from '../sites/whoisHelper.js';
import moment from "moment";

// async function retrievePopularSites() {
//     const siteHelper = new MostPopularSiteHelper(workerData.popularSiteListURL);
//     const siteObjectArray = await siteHelper.getSiteObjectArray();
    
//     for (const site of siteObjectArray) {
//         await addOneSiteToDatabase(site);
//     }

//     parentPort.postMessage({
//         siteRetrievalTime: new Date()
//     });

//     return workerData.collectSiteDataPeriodDays;
// }

async function visitStoredrSites() {

    const database = new DatabaseHelper(workerData.mongoURI);
    await database.initializeConnectionAndOpenDatabase(workerData.databaseName);
    (await database.getAllCollectionValues(workerData.popularSiteCollectionName)).forEach(site => {
        addOneSiteToDatabase(site);
    });

    parentPort.postMessage({
        siteRetrievalTime: new Date()
    });

    return workerData.collectSiteDataPeriodDays;
}

async function addOneSiteToDatabase(site){
    const whoisHelper = new WhoisHelper();
    const database = new DatabaseHelper(workerData.mongoURI);
    await database.initializeConnectionAndOpenDatabase(workerData.databaseName);

    try {
        const siteRecord = await database.upsertSiteToDatabase(workerData.popularSiteCollectionName,site);
        const whoisResponse = await whoisHelper.getWhoisInfo(site.domainAddress);
        const siteOwnerRecord = await database.upsertSiteOwnerToDatabse(workerData.siteOwnersCollectionName,whoisResponse);
        const siteOwnerRecordId = siteOwnerRecord.value ? siteOwnerRecord.value._id : siteOwnerRecord.lastErrorObject.upserted;
        const siteRecordId = siteRecord.value ? siteRecord.value._id : siteRecord.lastErrorObject.upserted;
        await database.addSiteToOwner(workerData.siteOwnersCollectionName, siteOwnerRecordId,siteRecordId);
        if (!siteRecord.value) {
            siteRecord.value = await database.findOneRecordById(siteRecordId.toString(), workerData.popularSiteCollectionName);
        }
        siteRecord.value._id = siteRecordId.toString();
        parentPort.postMessage(siteRecord.value);
        return siteRecord.value;
    } catch (error) {
        console.error(error.message);
    }
}

parentPort.on('message', siteToVisit => {
    const siteHelper = new MostPopularSiteHelper(workerData.popularSiteListURL);
    console.log(`[${moment().format('DD.MM.YYYY HH:MM:SS')}] Site Retriever - Single Visit : '${siteToVisit}'`);
    addOneSiteToDatabase(siteHelper.constructSiteObject(siteToVisit));
});

// const collectSiteDataPeriodDays = await visitStoredrSites();

// const retreiveIntervalMilliseconds = 24*60*60*1000*collectSiteDataPeriodDays;
// setInterval(() => {visitStoredrSites();}, retreiveIntervalMilliseconds);
