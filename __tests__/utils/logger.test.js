import { logInfo, logError } from '../../modules/utils/logger.js';
import { DateTime } from 'luxon';
import { jest } from '@jest/globals'; // Import Jest's globals

describe('Logger Utilities', () => {
  let stdoutSpy;
  let stderrSpy;
  let fixedDateTime;

  beforeAll(() => {
    // Set a fixed time for consistent timestamp testing
    fixedDateTime = DateTime.fromObject({ year: 2023, month: 1, day: 15, hour: 10, minute: 30, second: 0 });
  });

  beforeEach(() => {
    // Spy on process.stdout.write and process.stderr.write
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => {});
    
    // Mock DateTime.now() to return a fixed time
    jest.spyOn(DateTime, 'now').mockReturnValue(fixedDateTime);
  });

  afterEach(() => {
    // Restore the original implementations
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    jest.restoreAllMocks(); // Restores all mocks, including DateTime.now
  });

  describe('logInfo', () => {
    it('should call process.stdout.write with the correct format', () => {
      const message = 'Test info message';
      logInfo(message);
      expect(stdoutSpy).toHaveBeenCalledTimes(1);
      const expectedTimestamp = `[${fixedDateTime.toFormat('dd.MM.yyyy HH:mm:ss')}]`;
      expect(stdoutSpy).toHaveBeenCalledWith(`${expectedTimestamp} INFO: ${message}\n`);
    });
  });

  describe('logError', () => {
    it('should call process.stderr.write with the message when only message is provided', () => {
      const message = 'Test error message without error object';
      logError(message);
      expect(stderrSpy).toHaveBeenCalledTimes(1);
      const expectedTimestamp = `[${fixedDateTime.toFormat('dd.MM.yyyy HH:mm:ss')}]`;
      expect(stderrSpy).toHaveBeenCalledWith(`${expectedTimestamp} ERROR: ${message}\n`);
    });

    it('should call process.stderr.write with message and error details if error is not an Error instance', () => {
      const message = 'Test error with plain object';
      const errorObj = { detail: 'some detail' };
      logError(message, errorObj);
      expect(stderrSpy).toHaveBeenCalledTimes(1);
      const expectedTimestamp = `[${fixedDateTime.toFormat('dd.MM.yyyy HH:mm:ss')}]`;
      expect(stderrSpy).toHaveBeenCalledWith(`${expectedTimestamp} ERROR: ${message} ${JSON.stringify(errorObj)}\n`);
    });

    it('should call process.stderr.write with message and error stack if an Error instance is provided', () => {
      const message = 'Test error with Error object';
      const errorObj = new Error('Something went wrong');
      errorObj.stack = 'Error: Something went wrong\n    at <test_stack_trace>';
      logError(message, errorObj);
      expect(stderrSpy).toHaveBeenCalledTimes(1);
      const expectedTimestamp = `[${fixedDateTime.toFormat('dd.MM.yyyy HH:mm:ss')}]`;
      expect(stderrSpy).toHaveBeenCalledWith(`${expectedTimestamp} ERROR: ${message}\n${errorObj.stack}\n`);
    });
  });
});
