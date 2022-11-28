import { MongoClient } from 'mongodb';
export { DatabaseClient };

class DatabaseClient {
    constructor(connectionString) {
        this.connection = new MongoClient(connectionString);
    }
  
    static getInstance(connectionString) {
      if (!this.instance) {
        this.instance = new DatabaseClient(connectionString);
      }
  
      return this.instance;
    }
  }
  