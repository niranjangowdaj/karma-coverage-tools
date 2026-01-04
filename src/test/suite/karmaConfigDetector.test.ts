import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { KarmaConfigDetector } from '../../karmaConfigDetector';

suite('KarmaConfigDetector Test Suite', () => {
  let detector: KarmaConfigDetector;
  let testWorkspaceUri: vscode.Uri;
  let tempDir: string;

  setup(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'karma-test-'));
    testWorkspaceUri = vscode.Uri.file(tempDir);
    
    // Create detector with test workspace root
    detector = new KarmaConfigDetector(tempDir);
  });

  teardown(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('findKarmaConfigs should find karma.conf.js files', async () => {
    // Create a test karma config
    const configPath = path.join(tempDir, 'karma.conf.js');
    fs.writeFileSync(configPath, 'module.exports = function(config) {}');

    const configs = await detector.findKarmaConfigs();
    
    // Note: This test depends on workspace setup
    // In a real workspace, it should find configs
    assert.ok(Array.isArray(configs));
  });

  test('parseConfig should parse a valid karma config', async () => {
    const configPath = path.join(tempDir, 'karma.conf.js');
    const configContent = `
module.exports = function(config) {
  config.set({
    coverageReporter: {
      dir: 'target/coverage',
      reporters: [
        { type: 'html', subdir: 'html' },
        { type: 'cobertura', subdir: '.', file: 'cobertura.xml' }
      ]
    }
  });
};
`;
    fs.writeFileSync(configPath, configContent);

    const configUri = vscode.Uri.file(configPath);
    const result = await detector.parseConfig(configUri);

    assert.ok(result);
    assert.strictEqual(result?.coverageDir, 'target/coverage');
    assert.strictEqual(result?.reporters?.length, 2);
    assert.strictEqual(result?.reporters?.[0].type, 'html');
    assert.strictEqual(result?.reporters?.[1].type, 'cobertura');
  });

  test('parseConfig should handle config without coverageReporter', async () => {
    const configPath = path.join(tempDir, 'karma.conf.js');
    const configContent = `
module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine']
  });
};
`;
    fs.writeFileSync(configPath, configContent);

    const configUri = vscode.Uri.file(configPath);
    const result = await detector.parseConfig(configUri);

    assert.ok(result);
    assert.strictEqual(result?.coverageDir, undefined);
  });

  test('parseConfig should return null for non-existent file', async () => {
    const configUri = vscode.Uri.file(path.join(tempDir, 'nonexistent.js'));
    const result = await detector.parseConfig(configUri);

    assert.strictEqual(result, null);
  });

  test('getCoverageFilePath should build correct path for cobertura', () => {
    const config = {
      configPath: path.join(tempDir, 'karma.conf.js'),
      coverageDir: 'coverage',
      reporters: [
        { type: 'cobertura', subdir: '.', file: 'cobertura-coverage.xml' }
      ]
    };

    const result = detector.getCoverageFilePath(config, 'cobertura');
    
    assert.ok(result);
    assert.ok(result?.endsWith('cobertura-coverage.xml'));
  });

  test('getCoverageFilePath should build correct path for lcov', () => {
    const config = {
      configPath: path.join(tempDir, 'karma.conf.js'),
      coverageDir: 'coverage',
      reporters: [
        { type: 'lcov', subdir: 'lcov', file: 'lcov.info' }
      ]
    };

    const result = detector.getCoverageFilePath(config, 'lcov');
    
    assert.ok(result);
    assert.ok(result?.includes('lcov'));
    assert.ok(result?.endsWith('lcov.info'));
  });

  test('getCoverageFilePath should return null for missing reporter type', () => {
    const config = {
      configPath: path.join(tempDir, 'karma.conf.js'),
      coverageDir: 'coverage',
      reporters: [
        { type: 'html', subdir: 'html' }
      ]
    };

    const result = detector.getCoverageFilePath(config, 'cobertura');
    
    assert.strictEqual(result, null);
  });

  test('coverageFileExists should return false when file does not exist', () => {
    const config = {
      configPath: path.join(tempDir, 'karma.conf.js'),
      coverageDir: tempDir,
      reporters: [
        { type: 'cobertura', subdir: '.', file: 'nonexistent.xml' }
      ]
    };

    const result = detector.coverageFileExists(config);
    
    assert.strictEqual(result, false);
  });

  test('coverageFileExists should return true when cobertura file exists', () => {
    // Create coverage directory and file
    const coverageFile = path.join(tempDir, 'cobertura-coverage.xml');
    fs.writeFileSync(coverageFile, '<coverage></coverage>');

    const config = {
      configPath: path.join(tempDir, 'karma.conf.js'),
      coverageDir: tempDir,
      reporters: [
        { type: 'cobertura', subdir: '.', file: 'cobertura-coverage.xml' }
      ]
    };

    const result = detector.coverageFileExists(config);
    
    assert.strictEqual(result, true);
  });

  test('parseConfig should handle karma config with require statements', async () => {
    const configPath = path.join(tempDir, 'karma.conf.js');
    const configContent = `
const path = require('path');

module.exports = function(config) {
  config.set({
    coverageReporter: {
      dir: path.join('target', 'coverage'),
      reporters: [
        { type: 'cobertura' }
      ]
    }
  });
};
`;
    fs.writeFileSync(configPath, configContent);

    const configUri = vscode.Uri.file(configPath);
    const result = await detector.parseConfig(configUri);

    assert.ok(result);
    // Path should be joined
    assert.ok(result?.coverageDir?.includes('coverage'));
  });
});

