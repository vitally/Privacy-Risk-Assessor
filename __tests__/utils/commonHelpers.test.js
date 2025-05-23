import { isIterable } from '../../modules/utils/commonHelpers.js';

describe('Common Helpers', () => {
  describe('isIterable', () => {
    // Test cases for iterable inputs
    it('should return true for an empty array', () => {
      expect(isIterable([])).toBe(true);
    });

    it('should return true for a non-empty array', () => {
      expect(isIterable([1, 2, 3])).toBe(true);
    });

    it('should return true for an empty string', () => {
      expect(isIterable('')).toBe(true);
    });

    it('should return true for a non-empty string', () => {
      expect(isIterable('hello')).toBe(true);
    });

    it('should return true for an empty Map', () => {
      expect(isIterable(new Map())).toBe(true);
    });

    it('should return true for a non-empty Map', () => {
      const map = new Map();
      map.set('a', 1);
      expect(isIterable(map)).toBe(true);
    });

    it('should return true for an empty Set', () => {
      expect(isIterable(new Set())).toBe(true);
    });

    it('should return true for a non-empty Set', () => {
      const set = new Set();
      set.add(1);
      expect(isIterable(set)).toBe(true);
    });

    it('should return true for arguments object (which is iterable)', () => {
      function testArguments() {
        expect(isIterable(arguments)).toBe(true);
      }
      testArguments();
    });

    // Test cases for non-iterable inputs
    it('should return false for null', () => {
      expect(isIterable(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isIterable(undefined)).toBe(false);
    });

    it('should return false for a number (e.g., 0)', () => {
      expect(isIterable(0)).toBe(false);
    });

    it('should return false for a number (e.g., 123)', () => {
      expect(isIterable(123)).toBe(false);
    });

    it('should return false for a boolean (true)', () => {
      expect(isIterable(true)).toBe(false);
    });

    it('should return false for a boolean (false)', () => {
      expect(isIterable(false)).toBe(false);
    });

    it('should return false for a plain object', () => {
      expect(isIterable({})).toBe(false);
    });

    it('should return false for a plain object with properties', () => {
      expect(isIterable({ a: 1, b: 2 })).toBe(false);
    });

    it('should return false for a function', () => {
      expect(isIterable(() => {})).toBe(false);
    });

    it('should return false for a Symbol', () => {
      expect(isIterable(Symbol('test'))).toBe(false);
    });
  });
});
