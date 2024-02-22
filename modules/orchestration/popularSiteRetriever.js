import { parentPort, workerData } from "worker_threads";
import { DatabaseHelper } from '../database/databaseHelper.js';
import { MostPopularSiteHelper } from '../sites/mostPopularSiteHelper.js';
import { WhoisHelper } from '../sites/whoisHelper.js';
import { DateTime } from 'luxon';
import fs from 'fs/promises';

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
        // if (site.domainAddress.includes('delfi')) {
        // }
        // if (site.accessible === false) {
        // }
    });

    parentPort.postMessage({
        siteRetrievalTime: new Date()
    });

    return workerData.collectSiteDataPeriodDays;
}

function objectIsNotEmpty(obj){
    return obj && Object.keys(obj).length > 0;
}

async function addOneSiteToDatabase(site){
    const whoisHelper = new WhoisHelper();
    const database = new DatabaseHelper(workerData.mongoURI);
    await database.initializeConnectionAndOpenDatabase(workerData.databaseName);

    try {
        const siteRecord = site._id ? site : await database.upsertSiteToDatabase(workerData.popularSiteCollectionName,site);
        const siteRecordId = siteRecord._id ? siteRecord._id : siteRecord.value ? siteRecord.value._id : siteRecord.lastErrorObject.upserted;
        let whoisResponse = null;
        const owners = await (await database.findOwnerBySiteId(workerData.siteOwnersCollectionName, siteRecordId)).toArray();
        if (owners && owners.length > 0) {
            whoisResponse = owners[0];
        }
        if (!objectIsNotEmpty(whoisResponse)) {
            try {
                whoisResponse = await whoisHelper.getWhoisInfo(site.domainAddress);
                const siteOwnerRecord = await database.upsertSiteOwnerToDatabse(workerData.siteOwnersCollectionName,whoisResponse);
                if (siteOwnerRecord) {
                    const siteOwnerRecordId = siteOwnerRecord.value ? siteOwnerRecord.value._id : siteOwnerRecord.lastErrorObject.upserted;
                    await database.addSiteToOwner(workerData.siteOwnersCollectionName, siteOwnerRecordId,siteRecordId);
                    whoisResponse = siteOwnerRecord.value;
                }
            } catch (error) {
                console.error(`[${DateTime.now().toFormat('dd.MM.yyyy HH:mm:ss')}] Site Retriever (${site.domainAddress}) - WHOIS Error: '${error.message}'`);
            }
            
        }
        if (!siteRecord.value) {
            siteRecord.value = await database.findOneRecordById(siteRecordId.toString(), workerData.popularSiteCollectionName);
        }
        if (!siteRecord.value._id) {
            siteRecord.value._id = siteRecordId;
        }
        siteRecord.value.owner = whoisResponse;
        parentPort.postMessage(siteRecord.value);
        return siteRecord.value;
    } catch (error) {
        console.error(error.message);
    }
}

parentPort.on('message', siteToVisit => {
    const siteHelper = new MostPopularSiteHelper(workerData.popularSiteListURL);
    console.log(`[${DateTime.now().toFormat('dd.MM.yyyy HH:mm:ss')}] Site Retriever - Single Visit : '${siteToVisit}'`);
    addOneSiteToDatabase(siteHelper.constructSiteObject(siteToVisit));
});

async function processFile(filePath) {
  try {
    // Read the content of the file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Split the content by line
    const lines = fileContent.trim().split('\n');
    
    // Map each line to an object with a domainAddress property
    const domainArray = lines.map(line => ({ domainAddress: 'https://' + line }));
    
    // Log or return the resulting array
    const database = new DatabaseHelper(workerData.mongoURI);
    await database.initializeConnectionAndOpenDatabase(workerData.databaseName);

    await database.insertMultipleRecords(workerData.popularSiteCollectionName,domainArray);

    return domainArray;
  } catch (error) {
    console.error('Error reading or processing the file:', error.message);
  }
}

// Call the function with the path to your file
// processFile('./config/latvianList.txt');


const collectSiteDataPeriodDays = await visitStoredrSites();

// const retreiveIntervalMilliseconds = 24*60*60*1000*collectSiteDataPeriodDays;
// setInterval(() => {visitStoredrSites();}, retreiveIntervalMilliseconds);
