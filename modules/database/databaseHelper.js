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

    async upsertSiteOwnerToDatabse(collectionName,whoisResponse){
        try {
            return this.openedDatabase.collection(collectionName).findOneAndUpdate(
                {name: whoisResponse['Name'] ? whoisResponse['Name'] : whoisResponse['Registrant Name']},
                {$set : {
                    name : whoisResponse['Name'] ? whoisResponse['Name'] : whoisResponse['Registrant Name'],
                    phone : whoisResponse['Phone'] ? whoisResponse['Phone'] : whoisResponse['Registrant Phone'],
                    address : whoisResponse['Address'] ? whoisResponse['Address'] : `${whoisResponse['Registrant Postal Code']}, ${whoisResponse['Registrant City']}, ${whoisResponse['Registrant Country']}`,
                    regNr : whoisResponse['RegNr'] ? whoisResponse['RegNr'] : '',
                }},
                {upsert : true}
            );
        } catch (error) {
            console.error(error.message);
            return error;
        }
    }

    async upsertCookiesToDatabse(collectionName,cookies){
        try {

            const bulkOps = cookies.map(cookie => ({
                updateOne: {
                    filter: { siteId: cookie.siteId, requestId: cookie.requestId },
                    update: { $set: cookie },
                    upsert: true
                }
            }));

            return await this.openedDatabase.collection(collectionName).bulkWrite(bulkOps);
        } catch (error) {
            console.error(error.message);
            return error;
        }
    }

    async updateSiteCookies(collectionName,site,cookies){
        return this.openedDatabase.collection(collectionName).findOneAndUpdate(
            {_id: site._id},
            {$set : {
                cookies : cookies
            }}
        );
    }

    async addSiteToOwner(collectionName,ownerId,siteId){
        return this.openedDatabase.collection(collectionName).findOneAndUpdate(
            {_id: ownerId},
            {$addToSet : {
                siteIds: ObjectId(siteId)
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

    async updateSiteFrames(collectionName,site,frames){
        return this.openedDatabase.collection(collectionName).findOneAndUpdate(
            {_id: site._id},
            {$set : {
                frames : frames
            }}
        );
    }

    async setSiteCanvasFingerprinting(collectionName,site){
        return this.openedDatabase.collection(collectionName).findOneAndUpdate(
            {_id: site._id},
            {$set : {
                canvasFingerprinting : true
            }}
        );
    }

    async upsertTrackerToDatabse(collectionName,site,tracker){
        return this.openedDatabase.collection(collectionName).findOneAndUpdate(
            {
                fullAddressWithoutParams: tracker.urlWithoutParams
            },
            {$set : {
                domainAddress: URLHelper.trimUrlToSecondLevelDomain(tracker.fullUrl),
                fullAddress : tracker.fullUrl,
                fullAddressWithoutParams : tracker.urlWithoutParams,
                headers : tracker.headers,
                method : tracker.method,
                postData : tracker.postData
            },
            $addToSet : {
                siteIds: ObjectId(site._id)
            }},
            {upsert : true}
        );
    }

    async getAllTheSitesWithRequestsAndOwners(sitesCollection,requestsCollection,ownersCollection){
        return await this.openedDatabase.collection(sitesCollection).aggregate([
            {
                $lookup: {
                    from: requestsCollection,
                    localField: '_id',
                    foreignField: 'siteIds',
                    as: 'requests'
                }
            },
            {
                $lookup: {
                    from: ownersCollection,
                    localField: '_id',
                    foreignField: 'siteIds',
                    as: 'owners'
                }
            },
        ]).toArray();
    }

    async getOneSitesWithRequestsAndOwners(siteId,sitesCollection,requestsCollection,ownersCollection){
        return await this.openedDatabase.collection(sitesCollection).aggregate([
            {
                $match: {
                    _id: ObjectId(siteId)
                }
            },
            {
                $lookup: {
                    from: requestsCollection,
                    localField: '_id',
                    foreignField: 'siteIds',
                    as: 'requests'
                }
            },
            {
                $lookup: {
                    from: ownersCollection,
                    localField: '_id',
                    foreignField: 'siteIds',
                    as: 'owners'
                }
            },
        ]).toArray();
    }

    async findOneRecordById(recordId, collectionName){
        return await this.openedDatabase.collection(collectionName).findOne({
            _id: ObjectId(recordId)
        });
    }
    
    async getAllRequestCountByDomainAddress(requestsCollection){
        return await this.openedDatabase.collection(requestsCollection).aggregate([
            {
                $group: {
                    _id: '$domainAddress',
                    count: { $sum: { $size: '$siteIds' } }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();
    }

    async getAllCokiesByDomain(sitesCollection){
        return await this.openedDatabase.collection(sitesCollection).aggregate(
            [
              {
                $unwind: {
                  path: '$cookies',
                  preserveNullAndEmptyArrays: false
                }
              },
              {
                $project: {
                  domainAddress: 1,
                  cookieName: '$cookies.name',
                  cookieDomain: '$cookies.domain',
                  cookieExpires: '$cookies.expires'
                }
              },
              {
                $addFields: {
                  cookieDomain: {
                    $cond: [
                      {
                        $eq: [
                          {
                            $substr: ['$cookieDomain', 0, 1]
                          },
                          '.'
                        ]
                      },
                      { $substr: ['$cookieDomain', 1, -1] },
                      '$cookieDomain'
                    ]
                  },
                  cookieExpiresDate: {
                    $cond: [
                      { $eq: ['$cookieExpires', -1] },
                      null,
                      {
                        $toDate: {
                          $multiply: [
                            {
                              $convert: {
                                input: '$cookieExpires',
                                to: 'double'
                              }
                            },
                            1000
                          ]
                        }
                      }
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: '$cookieDomain',
                  details: {
                    $push: {
                      domain: '$domainAddress',
                      name: '$cookieName',
                      expires: '$cookieExpiresDate'
                    }
                  },
                  domainAddresses: {
                    $addToSet: '$domainAddress'
                  },
                  count: { $count: {} }
                }
              },
              { $sort: { count: -1 } }
            ],
            { maxTimeMS: 60000, allowDiskUse: true }
          );
    }
}

