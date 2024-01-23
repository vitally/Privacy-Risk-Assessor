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

    async getOneSiteByDomainAddress(collectionName,domainAddress){
        return this.openedDatabase.collection(collectionName).findOne(
            this.createNameValueJSON('domainAddress',domainAddress),
            {_id : 1}
        );
    }

    async updateSiteStats(collectionName,site){
        return this.openedDatabase.collection(collectionName).findOneAndUpdate(
            {_id: site._id},
            {$set : {
                thirdPartyRequestCookies : site.cookiesSetByThirdPartyRequests || 0,
                thirdPartyFrames : site.framesReferringToThirdPartyDomains || 0,
                thirdPartyRequests : site.thirdPartyDomainsAddressed || 0,
                transparentOwner : site.ownerWithProperName || 0,
                totalRequestCount : site.totalRequestCount || 0,
                thirdPartyRequestCount : site.thirdPartyRequestCount || 0,
                thirdPartyRequestFraction : site.thirdPartyRequestFraction || 0,
                totalCookiesCount : site.totalCookieCount || 0,
                thirdPartyCookieCount : site.thirdPartyCookieCount || 0,
                thirdPartyCookieFraction : site.thirdPartyCookieFraction || 0,
                cookieInDisguiseCount : site.cookieInDisguiseCount || 0
            }}
        );
    }

    async upsertSiteToDatabase(collectionName,site){
        return this.openedDatabase.collection(collectionName).findOneAndUpdate(
            this.createNameValueJSON('domainAddress',site.domainAddress),
            {$set : {
                domainAddress : site.domainAddress,
                visitDate : new Date(),
                scheme : site.scheme,
                fullAddress : site.fullAddress,
                accessible : site.accessible,
                error : site.error
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

    async updateSiteCookies(collectionName,site){
        return this.openedDatabase.collection(collectionName).findOneAndUpdate(
            {_id: site._id},
            {$set : {
                cookies : site.cookies
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

    async updateSiteLocalStorage(collectionName,site){
        return this.openedDatabase.collection(collectionName).findOneAndUpdate(
            {_id: site._id},
            {$set : {
                localStorage : site.localStorage
            }}
        );
    }

    async updateSiteFrames(collectionName,site){
        return this.openedDatabase.collection(collectionName).findOneAndUpdate(
            {_id: site._id},
            {$set : {
                frames : site.frames
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
                postData : tracker.postData,
                parameters: tracker.parameters
            },
            $addToSet : {
                siteIds: site._id
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
                  cookieDomain: '$cookies.domainName',
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
        ).toArray();
    }

    async getAllSiteStats(sitesCollection){
        return await this.openedDatabase.collection(sitesCollection).aggregate(
            [
                {
                  '$match': {
                    'accessible': true
                  }
                }, {
                  '$addFields': {
                    'visitDate': {
                      '$dateToString': {
                        'date': '$visitDate'
                      }
                    }, 
                    'thirdPartyRequestCount': '$thirdPartyRequests.stats.domains.totalCount', 
                    'thirdPartyRequestsPerDomain': '$thirdPartyRequests.stats.domains.counts', 
                    'thirdPartyRequestsPerDomainMean': '$thirdPartyRequests.stats.domains.mean', 
                    'thirdPartyRequestsPerDomainMedian': '$thirdPartyRequests.stats.domains.median', 
                    'thirdPartyRequestsPerDomainDiversityIndex': '$thirdPartyRequests.stats.domains.shannonDiversityIndex', 
                    'thirdPartyRequestsExecutionTimeMs': '$thirdPartyRequests.stats.executionTimesInMilliseconds.totalCount', 
                    'thirdPartyRequestsExecutionTimePerDomainMs': '$thirdPartyRequests.stats.executionTimesInMilliseconds.counts', 
                    'thirdPartyRequestsPerDomainExecutionTimeMsMean': '$thirdPartyRequests.stats.executionTimesInMilliseconds.mean', 
                    'thirdPartyRequestsPerDomainExecutionTimeMsMedian': '$thirdPartyRequests.stats.executionTimesInMilliseconds.median', 
                    'thirdPartyDomainRequestCookieCount': '$thirdPartyRequestCookies.stats.domains.totalCount', 
                    'thirdPartyDomainRequestCookiePerDomain': '$thirdPartyRequestCookies.stats.domains.counts', 
                    'thirdPartyDomainRequestCookieDiversityIndex': '$thirdPartyRequestCookies.stats.domains.shannonDiversityIndex', 
                    'thirdPartyDomainRequestCookieMeanExpirationDays': '$thirdPartyRequestCookies.stats.expirationsInDays.mean', 
                    'thirdPartyDomainRequestCookieMedianExpirationDays': '$thirdPartyRequestCookies.stats.expirationsInDays.median', 
                    'thirdPartyDomainFrameCount': '$thirdPartyFrames.stats.domains.totalCount', 
                    'thirdPartyDomainFramesPerDomain': '$thirdPartyFrames.stats.domains.counts', 
                    'distinctThirdPartyDomainsAddressed': {
                      '$cond': {
                        'if': {
                          '$not': [
                            '$thirdPartyRequests.stats.domains.counts'
                          ]
                        }, 
                        'then': 0, 
                        'else': {
                          '$size': {
                            '$ifNull': [
                              {
                                '$objectToArray': '$thirdPartyRequests.stats.domains.counts'
                              }, []
                            ]
                          }
                        }
                      }
                    }, 
                    'distinctThirdPartyCookieDomains': {
                      '$cond': {
                        'if': {
                          '$not': [
                            '$thirdPartyRequestCookies.stats.domains.counts'
                          ]
                        }, 
                        'then': 0, 
                        'else': {
                          '$size': {
                            '$ifNull': [
                              {
                                '$objectToArray': '$thirdPartyRequestCookies.stats.domains.counts'
                              }, []
                            ]
                          }
                        }
                      }
                    }
                  }
                }, {
                  '$unset': [
                    'accessible', 'fullAddress', 'scheme', 'error', 'thirdPartyFrames', 'thirdPartyRequests', 'thirdPartyRequestCookies', '_id', 'cookies', 'localStorage', 'frames'
                  ]
                }
              ],
            { maxTimeMS: 60000, allowDiskUse: true }
        ).toArray();
    }

    async getSiteTotals(sitesCollection){
        return await this.openedDatabase.collection(sitesCollection).aggregate(
            [
                {
                  '$match': {
                    'accessible': true
                  }
                }, {
                  '$group': {
                    '_id': null, 
                    'visitedSiteCount': {
                      '$sum': 1
                    }, 
                    'cookiesInDisguise': {
                      '$sum': '$cookieInDisguiseCount'
                    }, 
                    'totalRequests': {
                      '$sum': '$totalRequestCount'
                    }, 
                    'thirdPartyRequests': {
                      '$sum': '$thirdPartyRequestCount'
                    }, 
                    'totalCookies': {
                      '$sum': '$totalCookiesCount'
                    }, 
                    'thirdPartyRequestCookies': {
                      '$sum': '$thirdPartyCookieCount'
                    }
                  }
                }, {
                    '$unset': '_id'
                }
            ]
        ).toArray();
    }
}

