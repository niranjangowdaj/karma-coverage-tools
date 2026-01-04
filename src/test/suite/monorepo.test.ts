import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { KarmaConfigDetector } from '../../karmaConfigDetector';

suite('Monorepo Support Test Suite', () => {
  test('should find all configs in monorepo structure', async () => {
    const workspaceRoot = path.resolve(__dirname, '../../../test-fixtures/monorepo');
    const detector = new KarmaConfigDetector(workspaceRoot);

    // Verify test files exist
    const frontendPath = path.join(workspaceRoot, 'frontend.conf.js');
    const backendPath = path.join(workspaceRoot, 'backend.conf.js');
    const sharedPath = path.join(workspaceRoot, 'shared.conf.js');

    assert.ok(fs.existsSync(frontendPath), 'frontend.conf.js should exist');
    assert.ok(fs.existsSync(backendPath), 'backend.conf.js should exist');
    assert.ok(fs.existsSync(sharedPath), 'shared.conf.js should exist');
  });

  test('should parse all monorepo configs with coverage', async () => {
    const workspaceRoot = path.resolve(__dirname, '../../../test-fixtures/monorepo');
    const detector = new KarmaConfigDetector(workspaceRoot);

    const frontendUri = vscode.Uri.file(path.join(workspaceRoot, 'frontend.conf.js'));
    const backendUri = vscode.Uri.file(path.join(workspaceRoot, 'backend.conf.js'));
    const sharedUri = vscode.Uri.file(path.join(workspaceRoot, 'shared.conf.js'));

    const frontendConfig = await detector.parseConfig(frontendUri);
    const backendConfig = await detector.parseConfig(backendUri);
    const sharedConfig = await detector.parseConfig(sharedUri);

    // All should have coverage
    assert.ok(frontendConfig?.coverageDir, 'Frontend should have coverage');
    assert.ok(backendConfig?.coverageDir, 'Backend should have coverage');
    assert.ok(sharedConfig?.coverageDir, 'Shared should have coverage');

    // Different coverage directories
    assert.strictEqual(frontendConfig?.coverageDir, 'packages/frontend/coverage');
    assert.strictEqual(backendConfig?.coverageDir, 'packages/backend/coverage');
    assert.strictEqual(sharedConfig?.coverageDir, 'packages/shared/coverage');
  });

  test('should handle different reporter types across packages', async () => {
    const workspaceRoot = path.resolve(__dirname, '../../../test-fixtures/monorepo');
    const detector = new KarmaConfigDetector(workspaceRoot);

    const frontendUri = vscode.Uri.file(path.join(workspaceRoot, 'frontend.conf.js'));
    const backendUri = vscode.Uri.file(path.join(workspaceRoot, 'backend.conf.js'));
    const sharedUri = vscode.Uri.file(path.join(workspaceRoot, 'shared.conf.js'));

    const frontendConfig = await detector.parseConfig(frontendUri);
    const backendConfig = await detector.parseConfig(backendUri);
    const sharedConfig = await detector.parseConfig(sharedUri);

    // Frontend has html and cobertura
    const frontendTypes = frontendConfig?.reporters?.map(r => r.type);
    assert.ok(frontendTypes?.includes('html'));
    assert.ok(frontendTypes?.includes('cobertura'));

    // Backend has lcov and json
    const backendTypes = backendConfig?.reporters?.map(r => r.type);
    assert.ok(backendTypes?.includes('lcov'));
    assert.ok(backendTypes?.includes('json'));

    // Shared has all three
    const sharedTypes = sharedConfig?.reporters?.map(r => r.type);
    assert.ok(sharedTypes?.includes('html'));
    assert.ok(sharedTypes?.includes('lcov'));
    assert.ok(sharedTypes?.includes('cobertura'));
  });

  test('should build correct coverage paths for each package', async () => {
    const workspaceRoot = path.resolve(__dirname, '../../../test-fixtures/monorepo');
    const detector = new KarmaConfigDetector(workspaceRoot);

    const frontendUri = vscode.Uri.file(path.join(workspaceRoot, 'frontend.conf.js'));
    const frontendConfig = await detector.parseConfig(frontendUri);

    const coberturaPath = detector.getCoverageFilePath(frontendConfig!, 'cobertura');
    
    assert.ok(coberturaPath, 'Should generate path');
    assert.ok(coberturaPath?.includes('packages/frontend/coverage'), 'Should include package path');
    assert.ok(coberturaPath?.endsWith('cobertura.xml'), 'Should end with filename');
  });

  test('should handle monorepo with mixed configs (some with coverage, some without)', async () => {
    const workspaceRoot = path.resolve(__dirname, '../../../test-fixtures');
    const detector = new KarmaConfigDetector(workspaceRoot);

    // Manually check the specific files we know exist
    const configs = [
      vscode.Uri.file(path.join(workspaceRoot, 'karma-ci.conf.js')),
      vscode.Uri.file(path.join(workspaceRoot, 'karma-dev.conf.js')),
      vscode.Uri.file(path.join(workspaceRoot, 'karma-unit.conf.js')),
      vscode.Uri.file(path.join(workspaceRoot, 'monorepo/frontend.conf.js')),
      vscode.Uri.file(path.join(workspaceRoot, 'monorepo/backend.conf.js'))
    ];

    const withCoverage: any[] = [];
    const withoutCoverage: any[] = [];

    for (const uri of configs) {
      if (!fs.existsSync(uri.fsPath)) {
        continue; // Skip non-existent files
      }
      
      const parsed = await detector.parseConfig(uri);
      if (parsed?.coverageDir) {
        withCoverage.push(parsed);
      } else if (parsed) {
        withoutCoverage.push(parsed);
      }
    }

    console.log(`Found ${withCoverage.length} configs with coverage`);
    console.log(`Found ${withoutCoverage.length} configs without coverage`);

    // We should have configs both with and without coverage
    assert.ok(withCoverage.length >= 4, 'Should have at least 4 configs with coverage');
    assert.ok(withoutCoverage.length >= 1, 'Should have at least 1 config without coverage (karma-dev)');
  });
});

