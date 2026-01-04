import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { KarmaConfigDetector } from '../../karmaConfigDetector';

suite('Real Karma Config Test Suite', () => {
  test('should parse real karma config with coverageReporter.dir', async () => {
    // Use the real karma config from test-fixtures
    const workspaceRoot = path.resolve(__dirname, '../../../');
    const configPath = path.join(workspaceRoot, 'test-fixtures', 'real-karma.conf.js');
    
    // Verify the test file exists
    assert.ok(fs.existsSync(configPath), 'real-karma.conf.js should exist in test-fixtures');
    
    const detector = new KarmaConfigDetector(workspaceRoot);
    const configUri = vscode.Uri.file(configPath);
    const result = await detector.parseConfig(configUri);

    // Verify parsing succeeded
    assert.ok(result, 'Config should parse successfully');
    
    // Verify coverageDir is extracted from coverageReporter.dir
    console.log('Parsed config:', JSON.stringify(result, null, 2));
    assert.strictEqual(
      result?.coverageDir, 
      'target/coverage/frontend-unit-metric/',
      'coverageDir should be extracted from coverageReporter.dir'
    );
    
    // Verify reporters are extracted
    assert.strictEqual(result?.reporters?.length, 4, 'Should have 4 reporters');
    
    // Verify reporter types
    const reporterTypes = result?.reporters?.map(r => r.type);
    assert.ok(reporterTypes?.includes('html'), 'Should include html reporter');
    assert.ok(reporterTypes?.includes('text'), 'Should include text reporter');
    assert.ok(reporterTypes?.includes('lcov'), 'Should include lcov reporter');
    assert.ok(reporterTypes?.includes('cobertura'), 'Should include cobertura reporter');
    
    // Verify cobertura config
    const coberturaReporter = result?.reporters?.find(r => r.type === 'cobertura');
    assert.strictEqual(coberturaReporter?.subdir, '.', 'Cobertura subdir should be "."');
    assert.strictEqual(
      coberturaReporter?.file, 
      'cobertura-coverage.xml',
      'Cobertura file should be cobertura-coverage.xml'
    );
  });

  test('should build correct coverage file path for real config', async () => {
    const workspaceRoot = path.resolve(__dirname, '../../../');
    const configPath = path.join(workspaceRoot, 'test-fixtures', 'real-karma.conf.js');
    
    const detector = new KarmaConfigDetector(workspaceRoot);
    const configUri = vscode.Uri.file(configPath);
    const result = await detector.parseConfig(configUri);

    assert.ok(result, 'Config should parse');
    
    // Get cobertura path
    const coberturaPath = detector.getCoverageFilePath(result!, 'cobertura');
    
    assert.ok(coberturaPath, 'Cobertura path should be generated');
    console.log('Generated cobertura path:', coberturaPath);
    
    // Should end with the correct filename
    assert.ok(
      coberturaPath?.endsWith('cobertura-coverage.xml'),
      'Path should end with cobertura-coverage.xml'
    );
    
    // Should include the coverage dir
    assert.ok(
      coberturaPath?.includes('target/coverage/frontend-unit-metric'),
      'Path should include the coverage directory'
    );
  });
});

