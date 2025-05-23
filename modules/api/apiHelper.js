import { DatabaseHelper } from "../database/databaseHelper.js";
import { DocumentHelper } from "../docs/documentHelper.js";

export { ApiHelper };

class ApiHelper {

    constructor(config){
        this.config = config;
        this.database = new DatabaseHelper(this.config.mongoURI);
    }

    async getAllSites(){
       await this.database.initializeConnectionAndOpenDatabase(this.config.databaseName);
       return await (await this.database.getAllCollectionValues(this.config.popularSiteCollectionName)).toArray();
    }

    async getAllOwners(){
       await this.database.initializeConnectionAndOpenDatabase(this.config.databaseName);
       return await (await this.database.getAllCollectionValues(this.config.siteOwnersCollectionName)).toArray();
    }

    async getAllTrackers(){
       await this.database.initializeConnectionAndOpenDatabase(this.config.databaseName);
       return await (await this.database.getAllCollectionValues(this.config.trackerCollectionName)).toArray();
    }

    async getAllTheSitesWithRequestsAndOwners(){
      await this.database.initializeConnectionAndOpenDatabase(this.config.databaseName);
      return await this.database.getAllTheSitesWithRequestsAndOwners(this.config.popularSiteCollectionName,this.config.trackerCollectionName, this.config.siteOwnersCollectionName);
    }

    async getAllCookiesByDomain(){
      await this.database.initializeConnectionAndOpenDatabase(this.config.databaseName);
      return await this.database.getAllCokiesByDomain(this.config.popularSiteCollectionName);
    }

    async getAllSiteStats(){
      await this.database.initializeConnectionAndOpenDatabase(this.config.databaseName);
      return await this.database.getAllSiteStats(this.config.popularSiteCollectionName);
    }

    async getSiteTotals(){
      await this.database.initializeConnectionAndOpenDatabase(this.config.databaseName);
      return await this.database.getSiteTotals(this.config.popularSiteCollectionName);
    }

    async getAllRequestCountByDomainAddress(){
      await this.database.initializeConnectionAndOpenDatabase(this.config.databaseName);
      return await this.database.getAllRequestCountByDomainAddress(this.config.trackerCollectionName);
    }

    async saveFingerprintData(fingerprintData) {
      // Ensure database is initialized for this operation if it's not guaranteed globally for ApiHelper
      // For simplicity, assuming database connection is handled before API calls or is persistent.
      // If not, await this.database.initializeConnectionAndOpenDatabase(this.config.databaseName);
      if (!this.database) {
        throw new Error("Database not available in ApiHelper for saving fingerprint data.");
      }
      // The method `insertDocument` in DatabaseHelper already checks if `openedDatabase` is set.
      // We rely on that internal check.
      return await this.database.insertDocument(this.config.fingerprintAttemptsCollectionName, fingerprintData);
    }

    async createComplaintDocument(docData){
      return DocumentHelper.createComplaintDoc(docData);
    }

}