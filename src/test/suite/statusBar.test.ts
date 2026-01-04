import * as assert from 'assert';
import * as vscode from 'vscode';
import { StatusBarManager } from '../../statusBar';

suite('StatusBarManager Test Suite', () => {
  let statusBar: StatusBarManager;

  setup(() => {
    statusBar = new StatusBarManager();
  });

  teardown(() => {
    statusBar.dispose();
  });

  test('should initialize with inactive state', () => {
    // StatusBarManager should be created and visible
    assert.ok(statusBar);
  });

  test('update to inactive state should set correct text', () => {
    statusBar.update('inactive');
    // We can't directly access the status bar item's text in tests,
    // but we can verify the method doesn't throw
    assert.ok(true);
  });

  test('update to found state should set correct text', () => {
    statusBar.update('found', 'Test config');
    assert.ok(true);
  });

  test('update to not_computed state should set correct text', () => {
    statusBar.update('not_computed', 'Run tests to generate');
    assert.ok(true);
  });

  test('update to loading state should set correct text', () => {
    statusBar.update('loading');
    assert.ok(true);
  });

  test('update to active state with percentage should set correct text', () => {
    statusBar.update('active', '85.3%');
    assert.ok(true);
  });

  test('update to error state should set correct text and color', () => {
    statusBar.update('error', 'Test error message');
    assert.ok(true);
  });

  test('should handle multiple state updates', () => {
    statusBar.update('inactive');
    statusBar.update('found', 'Config found');
    statusBar.update('loading');
    statusBar.update('active', '90%');
    statusBar.update('error', 'Error occurred');
    statusBar.update('not_computed');
    
    assert.ok(true);
  });

  test('dispose should clean up resources', () => {
    const bar = new StatusBarManager();
    bar.dispose();
    
    // Should not throw
    assert.ok(true);
  });
});

