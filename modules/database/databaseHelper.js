import { DatabaseClient } from "./databseClient.js";
import { URLHelper } from "../navigation/urlHelper.js";
import { ObjectId } from "mongodb";

export { DatabaseHelper };


class DatabaseHelper {

    constructor(connectionString){
        this.mongoClient = DatabaseClient.getInstance(connectionString);
    }
    
    async initializeConnection() {
        await this.mongoClient.connection.connect();
    }

    async initializeConnectionAndOpenDatabase(databaseName) {
        this.initializeConnection();
        this.openDatabase(databaseName);
    }

    async closeConnection() {
        await this.mongoClient.connection.close();
    }

    async listDatabases(){
        let databasesList = await this.mongoClient.connection.db().admin().listDatabases();
        console.log("Databases:");
        databasesList.databases.forEach(db => console.log(` - ${db.name}`));
    };

    async openDatabase(databaseName){
        this.openedDatabase = this.mongoClient.connection.db(databaseName);
    }
    
    async insertMultipleRecords(collectionName,recordArray){
        this.openedDatabase.collection(collectionName).insertMany(recordArray);
    }
    
    createNameValueJSON(fieldName,fieldValue){
        const queryString = '{"' + fieldName +'" : "' + fieldValue + '"}';
        return JSON.parse(queryString);
    }

    async valuesInCollection(collentionName,fieldName,fieldValue){
        return this.openedDatabase.collection(collentionName).find(this.createNameValueJSON(fieldName,fieldValue));
    }

    async getAllCollectionValues(collectionName){
        return this.openedDatabase.collection(collectionName).find();
    }

    async upsertSiteToDatabase(collectionName,site){
        return this.openedDatabase.collection(collectionName).findOneAndUpdate(
            this.createNameValueJSON('domainAddress',site.domainAddress),
            {$set : {
                domainAddress : site.domainAddress,
                visitDate : site.visitDate,
                scheme : site.scheme,
                fullAddress : site.fullAddress
            }},
            {upsert : true}
        );
    }

    async updateSiteCookies(collectionName,site,cookies){
        return this.openedDatabase.collection(collectionName).findOneAndUpdate(
            {_id: site._id},
            {$set : {
                cookies : cookies
            }}
        );
    }

    async updateSiteLocalStorage(collectionName,site,localStorage){
        return this.openedDatabase.collection(collectionName).findOneAndUpdate(
            {_id: site._id},
            {$set : {
                localStorage : localStorage
            }}
        );
    }

    async upsertTrackerToDatabse(collectionName,site,tracker){
        return this.openedDatabase.collection(collectionName).findOneAndUpdate(
            {
                fullAddress: tracker
            },
            {$set : {
                domainAddress: URLHelper.trimUrlToSecondLevelDomain(tracker),
                fullAddress : tracker
            },
            $addToSet : {
                siteIds: ObjectId(site._id)
            }},
            {upsert : true}
        );
    }

}

