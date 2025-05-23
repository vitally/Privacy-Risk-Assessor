import { AnalyticsHelper } from '../../modules/analytics/analyticsHelper.js';

describe('AnalyticsHelper', () => {
  // Mock the constructor dependencies if needed for other tests,
  // but for static/pure utility methods, direct testing is simpler if possible.
  // For this exercise, we're testing a calculation method that can be thought of as static
  // or easily testable with a dummy instance if necessary.

  // A minimal siteVisit object, only if the constructor or other methods need it.
  // For calculateMean, it's a static-like method in terms of its direct inputs/outputs.
  const dummySiteVisit = {
    requests: [],
    cookies: [],
    domainName: 'example.com',
  };

  // Instance for testing methods (even if some are pure, they might be instance methods)
  let analyticsHelper;
  beforeAll(() => {
    // Create a dummy instance. The constructor itself performs some calculations.
    // We are not testing the constructor here, but specific methods.
    analyticsHelper = new AnalyticsHelper(dummySiteVisit);
  });
  
  describe('calculateMean', () => {
    it('should return 0 for an empty counts object', () => {
      expect(analyticsHelper.calculateMean({})).toBe(0);
    });

    it('should calculate the mean correctly for a single item', () => {
      const counts = { a: 10 };
      expect(analyticsHelper.calculateMean(counts)).toBe(10);
    });

    it('should calculate the mean correctly for multiple items', () => {
      const counts = { a: 10, b: 20, c: 30 }; // Sum = 60, Count = 3, Mean = 20
      expect(analyticsHelper.calculateMean(counts)).toBe(20);
    });

    it('should calculate the mean correctly with zero values', () => {
      const counts = { a: 0, b: 10, c: 20 }; // Sum = 30, Count = 3, Mean = 10
      expect(analyticsHelper.calculateMean(counts)).toBe(10);
    });

    it('should calculate the mean correctly with negative values (if applicable, though counts are usually non-negative)', () => {
      const counts = { a: -10, b: 0, c: 10 }; // Sum = 0, Count = 3, Mean = 0
      expect(analyticsHelper.calculateMean(counts)).toBe(0);
    });
    
    it('should calculate the mean for counts with varying numbers', () => {
      const counts = { 'domain1.com': 5, 'domain2.com': 15, 'domain3.com': 7, 'domain4.com': 3 };
      // Sum = 5 + 15 + 7 + 3 = 30. Number of domains = 4. Mean = 30 / 4 = 7.5
      expect(analyticsHelper.calculateMean(counts)).toBe(7.5);
    });
  });

  // Test for calculateTotal as it's a direct dependency for _calculateStatsSummary and is simple
  describe('calculateTotal', () => {
    it('should return 0 for an empty counts object', () => {
        expect(analyticsHelper.calculateTotal({})).toBe(0);
    });

    it('should calculate the total sum correctly for a single item', () => {
        const counts = { a: 10 };
        expect(analyticsHelper.calculateTotal(counts)).toBe(10);
    });

    it('should calculate the total sum correctly for multiple items', () => {
        const counts = { a: 10, b: 20, c: 30 }; // Sum = 60
        expect(analyticsHelper.calculateTotal(counts)).toBe(60);
    });

    it('should calculate the total sum correctly with zero values', () => {
        const counts = { a: 0, b: 10, c: 20 }; // Sum = 30
        expect(analyticsHelper.calculateTotal(counts)).toBe(30);
    });
  });

  // Test for calculateMedian
  describe('calculateMedian', () => {
    it('should return 0 for an empty counts object', () => {
        expect(analyticsHelper.calculateMedian({})).toBe(0);
    });

    it('should return the value for a single item', () => {
        const counts = { a: 10 };
        expect(analyticsHelper.calculateMedian(counts)).toBe(10);
    });

    it('should calculate the median correctly for an odd number of items', () => {
        const counts = { a: 10, b: 20, c: 5 }; // Sorted values: 5, 10, 20. Median = 10
        expect(analyticsHelper.calculateMedian(counts)).toBe(10);
    });

    it('should calculate the median correctly for an even number of items', () => {
        const counts = { a: 10, b: 20, c: 5, d: 25 }; // Sorted values: 5, 10, 20, 25. Median = (10+20)/2 = 15
        expect(analyticsHelper.calculateMedian(counts)).toBe(15);
    });
  });
   // Test for calculateStandardDeviation
  describe('calculateStandardDeviation', () => {
    it('should return 0 for an empty counts object', () => {
        expect(analyticsHelper.calculateStandardDeviation({})).toBe(0);
    });

    it('should return 0 for a single item (no deviation)', () => {
        const counts = { a: 10 };
        expect(analyticsHelper.calculateStandardDeviation(counts)).toBe(0);
    });

    it('should calculate standard deviation correctly', () => {
        const counts = { a: 2, b: 4, c: 4, d: 4, e: 5, f: 5, g: 7, h: 9 };
        // Mean = (2+4+4+4+5+5+7+9)/8 = 5
        // Differences from mean: -3, -1, -1, -1, 0, 0, 2, 4
        // Squared differences: 9, 1, 1, 1, 0, 0, 4, 16
        // Sum of squared differences = 32
        // Variance = 32/8 = 4
        // Standard Deviation = sqrt(4) = 2
        expect(analyticsHelper.calculateStandardDeviation(counts)).toBe(2);
    });
  });
});
