import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { KarmaConfigDetector } from '../../karmaConfigDetector';

suite('Config Naming Pattern Test Suite', () => {
  test('should find karma.conf.js', async () => {
    const workspaceRoot = path.resolve(__dirname, '../../../');
    const configPath = path.join(workspaceRoot, 'test-fixtures', 'sample-karma.conf.js');
    
    assert.ok(fs.existsSync(configPath), 'sample-karma.conf.js should exist');
    
    const detector = new KarmaConfigDetector(workspaceRoot);
    const configUri = vscode.Uri.file(configPath);
    const result = await detector.parseConfig(configUri);
    
    assert.ok(result, 'Should parse karma.conf.js pattern');
  });

  test('should find karma-unit.conf.js pattern', async () => {
    const workspaceRoot = path.resolve(__dirname, '../../../');
    const configPath = path.join(workspaceRoot, 'test-fixtures', 'karma-unit.conf.js');
    
    assert.ok(fs.existsSync(configPath), 'karma-unit.conf.js should exist');
    
    const detector = new KarmaConfigDetector(workspaceRoot);
    const configUri = vscode.Uri.file(configPath);
    const result = await detector.parseConfig(configUri);
    
    assert.ok(result, 'Should parse karma-unit.conf.js pattern');
    assert.strictEqual(result?.coverageDir, 'coverage/unit');
  });

  test('should find my-app-karma.conf.js pattern', async () => {
    const workspaceRoot = path.resolve(__dirname, '../../../');
    const configPath = path.join(workspaceRoot, 'test-fixtures', 'my-app-karma.conf.js');
    
    assert.ok(fs.existsSync(configPath), 'my-app-karma.conf.js should exist');
    
    const detector = new KarmaConfigDetector(workspaceRoot);
    const configUri = vscode.Uri.file(configPath);
    const result = await detector.parseConfig(configUri);
    
    assert.ok(result, 'Should parse my-app-karma.conf.js pattern');
    assert.strictEqual(result?.coverageDir, 'reports/coverage');
  });

  test('should find karma-ci.conf.js pattern', async () => {
    const workspaceRoot = path.resolve(__dirname, '../../../');
    const configPath = path.join(workspaceRoot, 'test-fixtures', 'karma-ci.conf.js');
    
    assert.ok(fs.existsSync(configPath), 'karma-ci.conf.js should exist');
    
    const detector = new KarmaConfigDetector(workspaceRoot);
    const configUri = vscode.Uri.file(configPath);
    const result = await detector.parseConfig(configUri);
    
    assert.ok(result, 'Should parse karma-ci.conf.js pattern');
    assert.strictEqual(result?.coverageDir, 'target/coverage/ci');
  });

  test('should find real-karma.conf.js pattern', async () => {
    const workspaceRoot = path.resolve(__dirname, '../../../');
    const configPath = path.join(workspaceRoot, 'test-fixtures', 'real-karma.conf.js');
    
    assert.ok(fs.existsSync(configPath), 'real-karma.conf.js should exist');
    
    const detector = new KarmaConfigDetector(workspaceRoot);
    const configUri = vscode.Uri.file(configPath);
    const result = await detector.parseConfig(configUri);
    
    assert.ok(result, 'Should parse real-karma.conf.js pattern');
    assert.strictEqual(result?.coverageDir, 'target/coverage/frontend-unit-metric/');
  });

  test('all *conf.js patterns should be detected', () => {
    const patterns = [
      'karma.conf.js',
      'karma-unit.conf.js',
      'karma-integration.conf.js',
      'my-app-karma.conf.js',
      'project-karma.conf.js',
      'test.conf.js',
      'karma-ci.conf.js',
      'karma-dev.conf.js',
      'app.conf.js'
    ];

    // VS Code pattern **/*conf.js matches any file ending in conf.js
    const pattern = /conf\.js$/;
    
    patterns.forEach(filename => {
      assert.ok(
        pattern.test(filename),
        `${filename} should end with conf.js`
      );
    });
  });
});

