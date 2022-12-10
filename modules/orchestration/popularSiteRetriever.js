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
        const whoisResponse = await whoisHelper.getWhoisInfo(site.domainAddress);
        await database.upsertSiteToDatabase(workerData.popularSiteCollectionName,site);
    }

    await database.closeConnection();

    parentPort.postMessage({
        siteRetrievalTime: new Date()
    });

    return workerData.collectSiteDataPeriodDays;
}

function processSocketData(data){
    console.log(`WHOIS socket data: ${data}`);
}

const collectSiteDataPeriodDays = await retrievePopularSites();

const retreiveIntervalMilliseconds = 24*60*60*1000*collectSiteDataPeriodDays;
setInterval(() => {retrievePopularSites();}, retreiveIntervalMilliseconds);
