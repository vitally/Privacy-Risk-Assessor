import { ConfigurationHelper } from '../modules/configuration/configHelper.js';
import { jest } from '@jest/globals';
import * as fs  from 'fs';

describe('ConfigurationHelper', () => {
    describe('getParsedJson', () => {
        test('should parse the json file at the given path', () => {
            // Arrange
            const path = '../config/applicationConfig.json';

            const jsonText = JSON.stringify({key:'value'});

            // jest.mock('fs', () => {
            //     return {
            //       readFileSync: jest.fn().mockReturnValue(jsonText)
            //     }
            //   });

            jest.spyOn(fs, "readFileSync").mockReturnValue(jsonText);

            // Act
            const result = ConfigurationHelper.getParsedJson(path);

            // Assert
            expect(result).toEqual({key:'value'});
            expect(fs.readFileSync).toHaveBeenCalledWith(path);
        });
    });

    // describe("getConfig", () => {
    //     test("should return the config from the json file at the given path", () => {
    //         // Arrange
    //         const path = "./path/to/test/file.json";
    //         const jsonText = '{"config": {"key": "value"}}';
    //         jest.spyOn(fs, "readFileSync").mockReturnValue(jsonText);

    //         // Act
    //         const result = ConfigurationHelper.getConfig(path);

    //         // Assert
    //         expect(result).toEqual({"key": "value"});
    //         expect(fs.readFileSync).toHaveBeenCalledWith(path);
    //     });
    // });

    // describe("getWhoisServers", () => {
    //     test("should return the whois servers from the json file at the given path", () => {
    //         // Arrange
    //         const path = "./path/to/test/file.json";
    //         const jsonText = '{"whoisServers": ["server1", "server2"]}';
    //         jest.spyOn(fs, "readFileSync").mockReturnValue(jsonText);

    //         // Act
    //         const result = ConfigurationHelper.getWhoisServers(path);

    //         // Assert
    //         expect(result).toEqual(["server1", "server2"]);
    //         expect(fs.readFileSync).toHaveBeenCalledWith(path);
    //     });
    // });
});
