import { DatabaseClient } from '../modules/database/databseClient.js';
import { MongoClient } from 'mongodb';
import { jest } from '@jest/globals';

describe('DatabaseClient', () => {
    describe('getInstance', () => {
        test('Should create a new instance of the class if it does not exist', () => {
            // Arrange
            const connectionString = 'mongodb://localhost:27017';
            jest.spyOn(MongoClient.prototype, 'connect');

            // Act
            const instance1 = DatabaseClient.getInstance(connectionString);
            const instance2 = DatabaseClient.getInstance(connectionString);

            // Assert
            expect(instance1).toBeInstanceOf(DatabaseClient);
            expect(instance1).toBe(instance2);
        });
    });
});