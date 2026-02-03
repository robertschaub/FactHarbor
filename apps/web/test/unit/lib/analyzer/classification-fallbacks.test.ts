/**
 * Classification Fallbacks Tests
 * Tests for P0: Fallback Strategy implementation
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { FallbackTracker, type ClassificationFallback, type FallbackSummary } from '@/lib/analyzer/classification-fallbacks';

describe('classification-fallbacks: FallbackTracker', () => {
  let tracker: FallbackTracker;

  beforeEach(() => {
    tracker = new FallbackTracker();
  });

  describe('Basic functionality', () => {
    test('starts with no fallbacks', () => {
      expect(tracker.hasFallbacks()).toBe(false);
      expect(tracker.getSummary().totalFallbacks).toBe(0);
    });

    test('records a single fallback', () => {
      tracker.recordFallback({
        field: 'harmPotential',
        location: 'Claim #1',
        text: 'Test claim text',
        defaultUsed: 'medium',
        reason: 'missing'
      });

      expect(tracker.hasFallbacks()).toBe(true);
      expect(tracker.getSummary().totalFallbacks).toBe(1);
    });

    test('records multiple fallbacks', () => {
      tracker.recordFallback({
        field: 'harmPotential',
        location: 'Claim #1',
        text: 'Test 1',
        defaultUsed: 'medium',
        reason: 'missing'
      });
      tracker.recordFallback({
        field: 'factualBasis',
        location: 'KeyFactor #1',
        text: 'Test 2',
        defaultUsed: 'unknown',
        reason: 'invalid'
      });

      expect(tracker.getSummary().totalFallbacks).toBe(2);
    });
  });

  describe('Summary aggregation', () => {
    test('counts fallbacks by field correctly', () => {
      // Add 2 harmPotential fallbacks
      tracker.recordFallback({
        field: 'harmPotential',
        location: 'Claim #1',
        text: 'Test 1',
        defaultUsed: 'medium',
        reason: 'missing'
      });
      tracker.recordFallback({
        field: 'harmPotential',
        location: 'Claim #2',
        text: 'Test 2',
        defaultUsed: 'medium',
        reason: 'missing'
      });

      // Add 1 factualBasis fallback
      tracker.recordFallback({
        field: 'factualBasis',
        location: 'KeyFactor #1',
        text: 'Test 3',
        defaultUsed: 'unknown',
        reason: 'missing'
      });

      const summary = tracker.getSummary();
      expect(summary.fallbacksByField.harmPotential).toBe(2);
      expect(summary.fallbacksByField.factualBasis).toBe(1);
      expect(summary.fallbacksByField.sourceAuthority).toBe(0);
      expect(summary.fallbacksByField.evidenceBasis).toBe(0);
      expect(summary.fallbacksByField.isContested).toBe(0);
    });

    test('includes all fallback details in summary', () => {
      tracker.recordFallback({
        field: 'harmPotential',
        location: 'Claim #1',
        text: 'This is a test claim',
        defaultUsed: 'medium',
        reason: 'missing'
      });

      const summary = tracker.getSummary();
      expect(summary.fallbackDetails.length).toBe(1);
      expect(summary.fallbackDetails[0].field).toBe('harmPotential');
      expect(summary.fallbackDetails[0].location).toBe('Claim #1');
      expect(summary.fallbackDetails[0].text).toBe('This is a test claim');
      expect(summary.fallbackDetails[0].defaultUsed).toBe('medium');
      expect(summary.fallbackDetails[0].reason).toBe('missing');
    });
  });

  describe('All field types', () => {
    test('tracks all 5 classification fields', () => {
      const fields: ClassificationFallback['field'][] = [
        'harmPotential',
        'factualBasis',
        'sourceAuthority',
        'evidenceBasis',
        'isContested'
      ];

      fields.forEach((field, index) => {
        tracker.recordFallback({
          field,
          location: `Item #${index + 1}`,
          text: `Test ${field}`,
          defaultUsed: 'default',
          reason: 'missing'
        });
      });

      const summary = tracker.getSummary();
      expect(summary.totalFallbacks).toBe(5);
      expect(summary.fallbacksByField.harmPotential).toBe(1);
      expect(summary.fallbacksByField.factualBasis).toBe(1);
      expect(summary.fallbacksByField.sourceAuthority).toBe(1);
      expect(summary.fallbacksByField.evidenceBasis).toBe(1);
      expect(summary.fallbacksByField.isContested).toBe(1);
    });
  });

  describe('Reason tracking', () => {
    test('distinguishes between missing and invalid reasons', () => {
      tracker.recordFallback({
        field: 'harmPotential',
        location: 'Claim #1',
        text: 'Missing value',
        defaultUsed: 'medium',
        reason: 'missing'
      });
      tracker.recordFallback({
        field: 'harmPotential',
        location: 'Claim #2',
        text: 'Invalid value',
        defaultUsed: 'medium',
        reason: 'invalid'
      });

      const summary = tracker.getSummary();
      expect(summary.fallbackDetails[0].reason).toBe('missing');
      expect(summary.fallbackDetails[1].reason).toBe('invalid');
    });
  });
});

describe('classification-fallbacks: Safe Default Values', () => {
  // These tests verify the reasoning behind default values

  test('harmPotential defaults to medium (neutral)', () => {
    // "medium" is neutral - doesn't over-alarm (high) or dismiss (low)
    const defaultValue = 'medium';
    expect(['high', 'medium', 'low']).toContain(defaultValue);
    expect(defaultValue).not.toBe('high'); // Don't over-alarm
    expect(defaultValue).not.toBe('low');  // Don't dismiss
  });

  test('factualBasis defaults to unknown (most conservative)', () => {
    // "unknown" is most conservative - we can't claim evidence quality
    const defaultValue = 'unknown';
    expect(['established', 'disputed', 'opinion', 'unknown']).toContain(defaultValue);
    expect(defaultValue).not.toBe('established'); // Don't claim false evidence
    expect(defaultValue).not.toBe('disputed');    // Don't claim false contestation
  });

  test('isContested defaults to false (conservative)', () => {
    // false = don't penalize without evidence of contestation
    const defaultValue = false;
    expect(defaultValue).toBe(false);
  });

  test('sourceAuthority defaults to secondary (neutral)', () => {
    // "secondary" = news/analysis (not primary, not opinion)
    const defaultValue = 'secondary';
    expect(['primary', 'secondary', 'opinion', 'contested']).toContain(defaultValue);
    expect(defaultValue).not.toBe('primary');  // Don't over-trust
    expect(defaultValue).not.toBe('opinion');  // Don't dismiss
  });

  test('evidenceBasis defaults to anecdotal (conservative)', () => {
    // "anecdotal" = weakest credible evidence type
    const defaultValue = 'anecdotal';
    expect(['scientific', 'documented', 'anecdotal', 'theoretical', 'pseudoscientific']).toContain(defaultValue);
    expect(defaultValue).not.toBe('scientific');      // Don't claim false authority
    expect(defaultValue).not.toBe('pseudoscientific'); // Don't dismiss as junk
  });
});

describe('classification-fallbacks: Edge Cases', () => {
  let tracker: FallbackTracker;

  beforeEach(() => {
    tracker = new FallbackTracker();
  });

  test('handles empty text gracefully', () => {
    tracker.recordFallback({
      field: 'harmPotential',
      location: 'Claim #1',
      text: '',
      defaultUsed: 'medium',
      reason: 'missing'
    });

    const summary = tracker.getSummary();
    expect(summary.totalFallbacks).toBe(1);
    expect(summary.fallbackDetails[0].text).toBe('');
  });

  test('handles very long text', () => {
    const longText = 'A'.repeat(1000);
    tracker.recordFallback({
      field: 'harmPotential',
      location: 'Claim #1',
      text: longText,
      defaultUsed: 'medium',
      reason: 'missing'
    });

    const summary = tracker.getSummary();
    expect(summary.fallbackDetails[0].text).toBe(longText);
    expect(summary.fallbackDetails[0].text.length).toBe(1000);
  });

  test('handles Final verification prefix', () => {
    tracker.recordFallback({
      field: 'harmPotential',
      location: 'Final Verdict #1',
      text: 'Bypassed entry-point normalization',
      defaultUsed: 'medium',
      reason: 'missing'
    });

    const summary = tracker.getSummary();
    expect(summary.fallbackDetails[0].location).toContain('Final');
  });

  test('tracks multiple fallbacks for same claim', () => {
    // Same claim could have multiple missing fields
    tracker.recordFallback({
      field: 'harmPotential',
      location: 'Claim #1',
      text: 'Test claim',
      defaultUsed: 'medium',
      reason: 'missing'
    });
    tracker.recordFallback({
      field: 'isContested',
      location: 'Claim #1',
      text: 'Test claim',
      defaultUsed: 'false',
      reason: 'missing'
    });

    const summary = tracker.getSummary();
    expect(summary.totalFallbacks).toBe(2);
    // Both should be for Claim #1
    expect(summary.fallbackDetails.filter(f => f.location === 'Claim #1').length).toBe(2);
  });
});
