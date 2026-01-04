import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { KarmaConfigDetector } from '../../karmaConfigDetector';

suite('Multiple Karma Config Test Suite', () => {
  let detector: KarmaConfigDetector;
  let tempDir: string;

  setup(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'karma-multi-test-'));
    detector = new KarmaConfigDetector(tempDir);
  });

  teardown(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should parse only configs with coverageReporter', async () => {
    // Create config with coverageReporter
    const configWithCoverage = path.join(tempDir, 'karma.conf.js');
    fs.writeFileSync(configWithCoverage, `
module.exports = function(config) {
  config.set({
    coverageReporter: {
      dir: 'coverage',
      reporters: [{ type: 'html' }]
    }
  });
};
`);

    // Create config WITHOUT coverageReporter (for dev)
    const configWithoutCoverage = path.join(tempDir, 'karma.conf.dev.js');
    fs.writeFileSync(configWithoutCoverage, `
module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    browsers: ['Chrome']
  });
};
`);

    // Parse both configs
    const config1Uri = vscode.Uri.file(configWithCoverage);
    const config2Uri = vscode.Uri.file(configWithoutCoverage);

    const parsed1 = await detector.parseConfig(config1Uri);
    const parsed2 = await detector.parseConfig(config2Uri);

    // First should have coverageDir
    assert.ok(parsed1?.coverageDir, 'Config with coverageReporter should have coverageDir');
    assert.strictEqual(parsed1?.coverageDir, 'coverage');

    // Second should NOT have coverageDir
    assert.ok(parsed2, 'Config without coverageReporter should still parse');
    assert.strictEqual(parsed2?.coverageDir, undefined, 'Config without coverageReporter should have no coverageDir');
  });

  test('should handle multiple configs with different coverage settings', async () => {
    // CI config with cobertura
    const ciConfig = path.join(tempDir, 'karma.conf.ci.js');
    fs.writeFileSync(ciConfig, `
module.exports = function(config) {
  config.set({
    coverageReporter: {
      dir: 'target/coverage/ci',
      reporters: [
        { type: 'cobertura', subdir: '.', file: 'cobertura.xml' }
      ]
    }
  });
};
`);

    // Dev config with html only
    const devConfig = path.join(tempDir, 'karma.conf.dev.js');
    fs.writeFileSync(devConfig, `
module.exports = function(config) {
  config.set({
    coverageReporter: {
      dir: 'coverage/dev',
      reporters: [
        { type: 'html', subdir: 'report' }
      ]
    }
  });
};
`);

    const ciUri = vscode.Uri.file(ciConfig);
    const devUri = vscode.Uri.file(devConfig);

    const ciParsed = await detector.parseConfig(ciUri);
    const devParsed = await detector.parseConfig(devUri);

    // Both should have coverage
    assert.ok(ciParsed?.coverageDir);
    assert.ok(devParsed?.coverageDir);

    // But different directories
    assert.strictEqual(ciParsed?.coverageDir, 'target/coverage/ci');
    assert.strictEqual(devParsed?.coverageDir, 'coverage/dev');

    // Different reporters
    assert.strictEqual(ciParsed?.reporters?.[0].type, 'cobertura');
    assert.strictEqual(devParsed?.reporters?.[0].type, 'html');
  });

  test('should return null coverageDir for config without coverageReporter', async () => {
    const configPath = path.join(tempDir, 'karma.conf.nocoverage.js');
    fs.writeFileSync(configPath, `
module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', 'karma-typescript'],
    files: ['src/**/*.ts'],
    browsers: ['ChromeHeadless'],
    singleRun: true
  });
};
`);

    const configUri = vscode.Uri.file(configPath);
    const result = await detector.parseConfig(configUri);

    assert.ok(result, 'Should parse successfully');
    assert.strictEqual(result?.coverageDir, undefined, 'Should have no coverageDir');
    assert.strictEqual(result?.configPath, configPath, 'Should have configPath');
  });
});

