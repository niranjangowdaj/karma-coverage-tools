import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { KarmaConfigDetector } from '../../karmaConfigDetector';

suite('Nested Config Path Resolution Test Suite', () => {
  const workspaceRoot = path.join(__dirname, '..', '..', '..', 'test-fixtures');
  const detector = new KarmaConfigDetector(workspaceRoot);

  test('should resolve coverage paths relative to nested karma config', async () => {
    // Parse the nested karma config
    const configPath = path.join(workspaceRoot, 'nested', 'sub-project', 'karma.conf.js');
    const configUri = vscode.Uri.file(configPath);
    const parsedConfig = await detector.parseConfig(configUri);

    // Verify config was parsed
    assert.ok(parsedConfig, 'Config should be parsed');
    assert.strictEqual(parsedConfig?.coverageDir, './coverage', 'Coverage dir should be relative');

    // Get the Cobertura coverage file path
    const coberturaPath = detector.getCoverageFilePath(parsedConfig!, 'cobertura');
    
    console.log('Nested config path:', configPath);
    console.log('Resolved cobertura path:', coberturaPath);
    
    // Verify the path is resolved relative to the karma config directory, not workspace root
    assert.ok(coberturaPath, 'Cobertura path should be resolved');
    
    // Expected path should be: test-fixtures/nested/sub-project/coverage/cobertura.xml
    const expectedPath = path.join(workspaceRoot, 'nested', 'sub-project', 'coverage', 'cobertura.xml');
    assert.strictEqual(
      path.normalize(coberturaPath!),
      path.normalize(expectedPath),
      `Path should be resolved relative to karma config dir.\nExpected: ${expectedPath}\nActual: ${coberturaPath}`
    );
  });

  test('should resolve absolute coverage paths correctly', async () => {
    // Create a test config with absolute path
    const configPath = path.join(workspaceRoot, 'nested', 'sub-project', 'karma.conf.js');
    const absoluteCoverageDir = path.join(workspaceRoot, 'absolute-coverage');
    
    const testConfig = {
      configPath,
      coverageDir: absoluteCoverageDir,
      reporters: [{ type: 'cobertura', subdir: '.', file: 'coverage.xml' }]
    };

    const coberturaPath = detector.getCoverageFilePath(testConfig, 'cobertura');
    
    // Absolute paths should be preserved
    const expectedPath = path.join(absoluteCoverageDir, 'coverage.xml');
    assert.strictEqual(
      path.normalize(coberturaPath!),
      path.normalize(expectedPath),
      'Absolute paths should be preserved'
    );
  });

  test('should handle nested paths with ../ parent references', async () => {
    // Test config with parent directory reference
    const configPath = path.join(workspaceRoot, 'nested', 'sub-project', 'karma.conf.js');
    
    const testConfig = {
      configPath,
      coverageDir: '../shared-coverage',  // Goes up one level
      reporters: [{ type: 'lcov', subdir: 'lcov-report', file: 'lcov.info' }]
    };

    const lcovPath = detector.getCoverageFilePath(testConfig, 'lcov');
    
    console.log('Parent reference path:', lcovPath);
    
    // Expected: test-fixtures/nested/shared-coverage/lcov-report/lcov.info
    const expectedPath = path.join(workspaceRoot, 'nested', 'shared-coverage', 'lcov-report', 'lcov.info');
    assert.strictEqual(
      path.normalize(lcovPath!),
      path.normalize(expectedPath),
      'Should correctly resolve parent directory references'
    );
  });
});

