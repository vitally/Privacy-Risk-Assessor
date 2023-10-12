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

    async getAllRequestCountByDomainAddress(){
      await this.database.initializeConnectionAndOpenDatabase(this.config.databaseName);
      return await this.database.getAllRequestCountByDomainAddress(this.config.trackerCollectionName);
    }

    async createComplaintDocument(docData){
      return DocumentHelper.createComplaintDoc(docData);
    }

}