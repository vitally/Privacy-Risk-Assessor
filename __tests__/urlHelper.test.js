import { URLHelper } from '../modules/navigation/urlHelper.js';

describe('URLHelper', () => {
    describe('trimUrlToSecondLevelDomain', () => {
        test('Should return the second level domain of the URL', () => {
            // Arrange
            const url = 'https://www.example.com/path?param=value';

            // Act
            const result = URLHelper.trimUrlToSecondLevelDomain(url);

            // Assert
            expect(result).toEqual('example.com');
        });
    });

    describe('trimUrlToRemoveParameters', () => {
        test('Should return the URL without any parameters', () => {
            // Arrange
            const url = 'https://www.example.com/path?param1=value1&param2=value2';

            // Act
            const result = URLHelper.trimUrlToRemoveParameters(url);

            // Assert
            expect(result).toEqual('https://www.example.com/path');
        });
    });
});
