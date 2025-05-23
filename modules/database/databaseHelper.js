import { DatabaseClient } from "./databseClient.js";
import { URLHelper } from "../navigation/urlHelper.js";
import { ObjectId } from "mongodb";
import { logInfo, logError } from '../utils/logger.js'; // Import the logger

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
        logInfo("Databases:");
        databasesList.databases.forEach(db => logInfo(` - ${db.name}`));
    };

    async openDatabase(databaseName){
        this.openedDatabase = this.mongoClient.connection.db(databaseName);
    }
    
    async insertMultipleRecords(collectionName,recordArray){
        this.openedDatabase.collection(collectionName).insertMany(recordArray);
    }

    async insertDocument(collectionName, document) {
        if (!this.openedDatabase) {
            // This assumes that initializeConnectionAndOpenDatabase has been called
            // or needs to be called. For simplicity, let's assume it's been called
            // and this.openedDatabase is set. A robust implementation might need
            // to handle DB initialization more explicitly here if it could be called standalone.
            // However, in the context of app.js, the DB is initialized at startup.
            logError("Database not initialized before calling insertDocument");
            throw new Error("Database not initialized"); 
        }
        return await this.openedDatabase.collection(collectionName).insertOne(document);
    }
    
    // createNameValueJSON method is no longer needed and will be removed.

    async valuesInCollection(collentionName,fieldName,fieldValue){
        // Direct object literal for query
        return this.openedDatabase.collection(collentionName).find({ [fieldName]: fieldValue });
    }

    async getAllCollectionValues(collectionName){
        return this.openedDatabase.collection(collectionName).find();
    }

    async getOneSiteByDomainAddress(collectionName,domainAddress){
        // Direct object literal for query
        return this.openedDatabase.collection(collectionName).findOne(
            { domainAddress: domainAddress },
            {projection: {_id : 1}} // Ensure projection is explicitly named
        );
    }

    async findOwnerBySiteId(collectionName,siteId){
      const convertedId = typeof siteId === 'string' ? new ObjectId(siteId) : siteId;
      return this.openedDatabase.collection(collectionName).find({
        "siteIds": convertedId, 
        $and: [
          { "name": { $ne: null } },
          { "name": { $ne: "" } }
        ]
      });
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
                cookieInDisguiseCount : site.cookieInDisguiseCount || 0,
                cookieSetByRequestsWithCnameRedirectCount : site.cookieSetByRequestsWithCnameRedirectCount || 0,
                userConsentCompliance: site.thirdPartyCookieCount && site.thirdPartyCookieCount > 0 ? 1 : 0 
            }}
        );
    }

    async upsertSiteToDatabase(collectionName,site){
        // Direct object literal for query
        return this.openedDatabase.collection(collectionName).findOneAndUpdate(
            { domainAddress: site.domainAddress },
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
            const entityName = whoisResponse['Name'] ? whoisResponse['Name'] : whoisResponse['Registrant Name'];
            if (!entityName) {
              return null;
            }
            return this.openedDatabase.collection(collectionName).findOneAndUpdate(
                {name: entityName},
                {$set : {
                    name : entityName,
                    phone : whoisResponse['Phone'] ? whoisResponse['Phone'] : whoisResponse['Registrant Phone'],
                    address : whoisResponse['Address'] ? whoisResponse['Address'] : `${whoisResponse['Registrant Postal Code']}, ${whoisResponse['Registrant City']}, ${whoisResponse['Registrant Country']}`,
                    regNr : whoisResponse['RegNr'] ? whoisResponse['RegNr'] : '',
                }},
                {upsert : true}
            );
        } catch (error) {
            logError('Error in upsertSiteOwnerToDatabse:', error);
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
            logError('Error in upsertCookiesToDatabse:', error);
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
            // Stage 1: Lookup requests associated with each site
            {
                $lookup: {
                    from: requestsCollection, // The collection to join with
                    localField: '_id',         // Field from the input documents (sitesCollection)
                    foreignField: 'siteIds',   // Field from the documents of the "from" collection (requestsCollection)
                    as: 'requests'             // Output array field name
                }
            },
            // Stage 2: Lookup owners associated with each site
            {
                $lookup: {
                    from: ownersCollection,   // The collection to join with
                    localField: '_id',         // Field from the input documents (sitesCollection)
                    foreignField: 'siteIds',   // Field from the documents of the "from" collection (ownersCollection)
                    as: 'owners'               // Output array field name
                }
            },
        ]).toArray();
    }

    async getOneSitesWithRequestsAndOwners(siteId,sitesCollection,requestsCollection,ownersCollection){
        return await this.openedDatabase.collection(sitesCollection).aggregate([
            // Stage 1: Match a specific site by its ID
            {
                $match: {
                    _id: ObjectId(siteId) // Filter documents to pass only the document with the specified _id
                }
            },
            // Stage 2: Lookup requests associated with the matched site
            {
                $lookup: {
                    from: requestsCollection,
                    localField: '_id',
                    foreignField: 'siteIds',
                    as: 'requests'
                }
            },
            // Stage 3: Lookup owners associated with the matched site
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
            // Stage 1: Group documents by 'domainAddress'
            {
                $group: {
                    _id: '$domainAddress', // Group by the domainAddress field
                    count: { $sum: { $size: '$siteIds' } } // Calculate the sum of the sizes of 'siteIds' arrays for each group
                }
            },
            // Stage 2: Sort the grouped documents by 'count' in descending order
            {
                $sort: { count: -1 } // Sort by the 'count' field in descending order
            }
        ]).toArray();
    }

    async getAllCokiesByDomain(sitesCollection){
        return await this.openedDatabase.collection(sitesCollection).aggregate(
            [
              // Stage 1: Deconstruct the 'cookies' array field from the input documents to output a document for each element.
              {
                $unwind: {
                  path: '$cookies', // Specify the array field to unwind
                  preserveNullAndEmptyArrays: false // If true, outputs documents even if the array is null, empty or missing.
                }
              },
              // Stage 2: Project specific fields from the cookies.
              {
                $project: {
                  domainAddress: 1, // Include the original domainAddress of the site
                  cookieName: '$cookies.name',
                  cookieDomain: '$cookies.domainName',
                  cookieExpires: '$cookies.expires'
                }
              },
              // Stage 3: Add new fields or reshape existing ones.
              {
                $addFields: {
                  // Normalize cookieDomain: remove leading '.' if present.
                  cookieDomain: {
                    $cond: [
                      { $eq: [ { $substr: ['$cookieDomain', 0, 1] }, '.' ] }, // Condition: if first char is '.'
                      { $substr: ['$cookieDomain', 1, -1] }, // True: remove first char
                      '$cookieDomain' // False: keep as is
                    ]
                  },
                  // Convert cookieExpires from seconds/timestamp to a Date object.
                  // Handles -1 as a special case for session cookies (or non-persistent).
                  cookieExpiresDate: {
                    $cond: [
                      { $eq: ['$cookieExpires', -1] }, // If expires is -1
                      null, // Then set to null (or a specific marker for session cookies)
                      { // Else, convert to Date
                        $toDate: {
                          $multiply: [
                            { $convert: { input: '$cookieExpires', to: 'double' } }, // Ensure it's a number
                            1000 // Convert seconds to milliseconds
                          ]
                        }
                      }
                    ]
                  }
                }
              },
              // Stage 4: Group cookies by the normalized cookieDomain.
              {
                $group: {
                  _id: '$cookieDomain', // Group by the processed cookie domain
                  details: { // Push details of each cookie into an array
                    $push: {
                      domain: '$domainAddress', // The site domain where the cookie was found
                      name: '$cookieName',
                      expires: '$cookieExpiresDate'
                    }
                  },
                  domainAddresses: { // Collect unique site domainAddresses that use this cookie domain
                    $addToSet: '$domainAddress'
                  },
                  count: { $count: {} } // Count how many cookies are under this cookieDomain
                }
              },
              // Stage 5: Sort the results by count in descending order.
              { $sort: { count: -1 } }
            ],
            { maxTimeMS: 60000, allowDiskUse: true } // Options for the aggregation
        ).toArray();
    }

    async getAllSiteStats(sitesCollection){
        return await this.openedDatabase.collection(sitesCollection).aggregate(
            [
                // Stage 1: Filter for accessible sites only.
                {
                  '$match': {
                    'accessible': true
                  }
                }, 
                // Stage 2: Add new fields or reshape existing ones for easier analysis.
                {
                  '$addFields': {
                    // Convert visitDate to string format.
                    'visitDate': {
                      '$dateToString': {
                        'date': '$visitDate'
                      }
                    }, 
                    // Flatten nested stats for third-party requests.
                    'thirdPartyRequestCount': '$thirdPartyRequests.stats.domains.totalCount', 
                    'thirdPartyRequestsPerDomain': '$thirdPartyRequests.stats.domains.counts', 
                    'thirdPartyRequestsPerDomainMean': '$thirdPartyRequests.stats.domains.mean', 
                    'thirdPartyRequestsPerDomainMedian': '$thirdPartyRequests.stats.domains.median', 
                    'thirdPartyRequestsPerDomainDiversityIndex': '$thirdPartyRequests.stats.domains.shannonDiversityIndex', 
                    // Flatten nested stats for third-party request execution times.
                    'thirdPartyRequestsExecutionTimeMs': '$thirdPartyRequests.stats.executionTimesInMilliseconds.totalCount', 
                    'thirdPartyRequestsExecutionTimePerDomainMs': '$thirdPartyRequests.stats.executionTimesInMilliseconds.counts', 
                    'thirdPartyRequestsPerDomainExecutionTimeMsMean': '$thirdPartyRequests.stats.executionTimesInMilliseconds.mean', 
                    'thirdPartyRequestsPerDomainExecutionTimeMsMedian': '$thirdPartyRequests.stats.executionTimesInMilliseconds.median', 
                    // Flatten nested stats for third-party cookies.
                    'thirdPartyDomainRequestCookieCount': '$thirdPartyRequestCookies.stats.domains.totalCount', 
                    'thirdPartyDomainRequestCookiePerDomain': '$thirdPartyRequestCookies.stats.domains.counts', 
                    'thirdPartyDomainRequestCookieDiversityIndex': '$thirdPartyRequestCookies.stats.domains.shannonDiversityIndex', 
                    'thirdPartyDomainRequestCookieMeanExpirationDays': '$thirdPartyRequestCookies.stats.expirationsInDays.mean', 
                    'thirdPartyDomainRequestCookieMedianExpirationDays': '$thirdPartyRequestCookies.stats.expirationsInDays.median', 
                    // Flatten nested stats for third-party frames.
                    'thirdPartyDomainFrameCount': '$thirdPartyFrames.stats.domains.totalCount', 
                    'thirdPartyDomainFramesPerDomain': '$thirdPartyFrames.stats.domains.counts', 
                    // Calculate distinct third-party domains addressed.
                    'distinctThirdPartyDomainsAddressed': {
                      '$cond': { // Conditional expression
                        'if': { '$not': [ '$thirdPartyRequests.stats.domains.counts' ] }, // If no counts
                        'then': 0, // Then 0
                        'else': { '$size': { '$ifNull': [ { '$objectToArray': '$thirdPartyRequests.stats.domains.counts' }, [] ] } } // Else, size of the counts array
                      }
                    }, 
                    // Calculate distinct third-party cookie domains.
                    'distinctThirdPartyCookieDomains': {
                      '$cond': {
                        'if': { '$not': [ '$thirdPartyRequestCookies.stats.domains.counts' ] },
                        'then': 0,
                        'else': { '$size': { '$ifNull': [ { '$objectToArray': '$thirdPartyRequestCookies.stats.domains.counts' }, [] ] } }
                      }
                    }
                  }
                }, 
                // Stage 3: Remove fields that are no longer needed or have been reshaped.
                {
                  '$unset': [
                    'accessible', 'fullAddress', 'scheme', 'error', // Original site status fields
                    'thirdPartyFrames', 'thirdPartyRequests', 'thirdPartyRequestCookies', // Original nested structures
                    '_id', 'cookies', 'localStorage', 'frames' // Other details not needed for stats summary
                  ]
                }
              ],
            { maxTimeMS: 60000, allowDiskUse: true } // Options for the aggregation
        ).toArray();
    }

    async getSiteTotals(sitesCollection){
        return await this.openedDatabase.collection(sitesCollection).aggregate(
            [
                // Stage 1: Filter documents to include only accessible sites.
                {
                  '$match': {
                    'accessible': true 
                  }
                }, 
                // Stage 2: Group all matching documents to calculate totals.
                {
                  '$group': {
                    '_id': null, // Group all documents into a single group
                    'visitedSiteCount': { '$sum': 1 }, // Count the total number of visited (accessible) sites
                    'cookiesInDisguise': { '$sum': '$cookieInDisguiseCount' }, // Sum of cookies in disguise across all sites
                    'totalRequests': { '$sum': '$totalRequestCount' }, // Sum of total requests
                    'thirdPartyRequests': { '$sum': '$thirdPartyRequestCount' }, // Sum of third-party requests
                    'totalCookies': { '$sum': '$totalCookiesCount' }, // Sum of total cookies
                    'thirdPartyRequestCookies': { '$sum': '$thirdPartyCookieCount' } // Sum of third-party cookies
                  }
                }, 
                // Stage 3: Remove the _id field from the output.
                {
                    '$unset': '_id' // As _id was null (for grouping all), it's not meaningful in the final result.
                }
            ]
        ).toArray();
    }
}

