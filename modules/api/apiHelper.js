import { DatabaseHelper } from "../database/databaseHelper.js";

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
}