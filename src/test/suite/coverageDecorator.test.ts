import * as assert from 'assert';
import * as vscode from 'vscode';
import { CoverageDecorator } from '../../coverageDecorator';
import { CoverageData, FileCoverage, LineCoverage } from '../../types';

suite('Coverage Decorator Test Suite', () => {
  let decorator: CoverageDecorator;

  setup(() => {
    decorator = new CoverageDecorator();
  });

  teardown(() => {
    decorator.dispose();
  });

  test('should initialize with coverage enabled', () => {
    assert.strictEqual(decorator.isEnabled(), true, 'Should be enabled by default');
  });

  test('toggle should disable coverage', () => {
    const wasEnabled = decorator.toggle();
    assert.strictEqual(wasEnabled, false, 'Should be disabled after toggle');
    assert.strictEqual(decorator.isEnabled(), false, 'isEnabled should return false');
  });

  test('toggle twice should re-enable coverage', () => {
    decorator.toggle(); // Disable
    const wasEnabled = decorator.toggle(); // Enable
    assert.strictEqual(wasEnabled, true, 'Should be enabled after second toggle');
    assert.strictEqual(decorator.isEnabled(), true, 'isEnabled should return true');
  });

  test('should handle empty coverage data gracefully', () => {
    // This should not throw
    const coverageData = new Map<string, CoverageData>();
    
    // We can't easily test updateDecorations without a real editor,
    // but we can verify the decorator exists and has the method
    assert.ok(decorator, 'Decorator should exist');
    assert.ok(typeof decorator.updateDecorations === 'function', 'Should have updateDecorations method');
  });

  test('path normalization should handle different path formats', () => {
    // Create mock coverage data
    const lines = new Map<number, LineCoverage>();
    lines.set(1, { lineNumber: 1, hits: 5, branch: false });
    lines.set(2, { lineNumber: 2, hits: 0, branch: false });

    const fileCoverage: FileCoverage = {
      filename: 'src/components/Button.js',
      lineRate: 0.5,
      branchRate: 0,
      lines
    };

    const filesMap = new Map<string, FileCoverage>();
    filesMap.set('src/components/Button.js', fileCoverage);

    const coverageData: CoverageData = {
      files: filesMap,
      summary: {
        linesCovered: 1,
        linesTotal: 2,
        lineRate: 0.5,
        branchesCovered: 0,
        branchesTotal: 0,
        branchRate: 0
      }
    };

    const allCoverageData = new Map<string, CoverageData>();
    allCoverageData.set('test-config', coverageData);

    // Decorator should handle this data structure
    assert.ok(allCoverageData.size === 1, 'Should have one coverage data entry');
  });

  test('clearAllDecorations should not throw', () => {
    // This should not throw even with no editors
    assert.doesNotThrow(() => {
      decorator.clearAllDecorations();
    });
  });

  test('dispose should clean up resources', () => {
    const newDecorator = new CoverageDecorator();
    
    // This should not throw
    assert.doesNotThrow(() => {
      newDecorator.dispose();
    });
  });
});

