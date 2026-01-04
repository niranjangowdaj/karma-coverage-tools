import * as assert from 'assert';
import * as path from 'path';
import { CoverageParser } from '../../coverageParser';

suite('Coverage Parser Test Suite', () => {
  let parser: CoverageParser;

  setup(() => {
    parser = new CoverageParser();
  });

  test('should parse Cobertura XML file', () => {
    const filePath = path.resolve(__dirname, '../../../test-fixtures/coverage/cobertura-coverage.xml');
    const result = parser.parseCobertura(filePath);

    assert.ok(result, 'Should parse Cobertura file');
    assert.ok(result?.files, 'Should have files map');
    assert.ok(result?.summary, 'Should have summary');
  });

  test('should extract correct coverage statistics from Cobertura', () => {
    const filePath = path.resolve(__dirname, '../../../test-fixtures/coverage/cobertura-coverage.xml');
    const result = parser.parseCobertura(filePath);

    assert.ok(result, 'Should parse file');
    
    // Check summary - parser counts actual lines in the XML
    assert.ok(result?.summary.linesCovered > 0, 'Should have lines covered');
    assert.ok(result?.summary.linesTotal > 0, 'Should have total lines');
    assert.ok(result?.summary.lineRate > 0 && result?.summary.lineRate <= 1, 'Line rate should be between 0 and 1');
    
    // More specific: we have 11 total lines, 8 covered = 72.7%
    assert.strictEqual(result?.summary.linesTotal, 11, 'Should have 11 total lines in test data');
    assert.strictEqual(result?.summary.linesCovered, 8, 'Should have 8 lines covered in test data');
  });

  test('should parse file-level coverage from Cobertura', () => {
    const filePath = path.resolve(__dirname, '../../../test-fixtures/coverage/cobertura-coverage.xml');
    const result = parser.parseCobertura(filePath);

    assert.ok(result, 'Should parse file');
    assert.ok(result?.files.size > 0, 'Should have files');
    
    // Check Button.js
    const buttonFile = result?.files.get('src/components/Button.js');
    assert.ok(buttonFile, 'Should find Button.js');
    assert.strictEqual(buttonFile?.lineRate, 0.9, 'Button.js should have 90% coverage');
    
    // Check Input.js
    const inputFile = result?.files.get('src/components/Input.js');
    assert.ok(inputFile, 'Should find Input.js');
    assert.strictEqual(inputFile?.lineRate, 0.8, 'Input.js should have 80% coverage');
  });

  test('should parse line-level coverage from Cobertura', () => {
    const filePath = path.resolve(__dirname, '../../../test-fixtures/coverage/cobertura-coverage.xml');
    const result = parser.parseCobertura(filePath);

    const buttonFile = result?.files.get('src/components/Button.js');
    assert.ok(buttonFile, 'Should find Button.js');
    
    // Line 1 should be covered
    const line1 = buttonFile?.lines.get(1);
    assert.ok(line1, 'Should have line 1');
    assert.strictEqual(line1?.hits, 1, 'Line 1 should be hit once');
    
    // Line 7 should not be covered
    const line7 = buttonFile?.lines.get(7);
    assert.ok(line7, 'Should have line 7');
    assert.strictEqual(line7?.hits, 0, 'Line 7 should not be hit');
    
    // Line 5 should be a branch
    const line5 = buttonFile?.lines.get(5);
    assert.ok(line5, 'Should have line 5');
    assert.strictEqual(line5?.branch, true, 'Line 5 should be marked as branch');
  });

  test('should parse LCOV file', () => {
    const filePath = path.resolve(__dirname, '../../../test-fixtures/coverage/lcov.info');
    const result = parser.parseLcov(filePath);

    assert.ok(result, 'Should parse LCOV file');
    assert.ok(result?.files, 'Should have files map');
    assert.ok(result?.summary, 'Should have summary');
  });

  test('should extract correct file coverage from LCOV', () => {
    const filePath = path.resolve(__dirname, '../../../test-fixtures/coverage/lcov.info');
    const result = parser.parseLcov(filePath);

    assert.ok(result, 'Should parse file');
    assert.strictEqual(result?.files.size, 2, 'Should have 2 files');
    
    // Check files exist
    const buttonFile = result?.files.get('src/components/Button.js');
    const inputFile = result?.files.get('src/components/Input.js');
    
    assert.ok(buttonFile, 'Should find Button.js');
    assert.ok(inputFile, 'Should find Input.js');
  });

  test('should parse line data from LCOV', () => {
    const filePath = path.resolve(__dirname, '../../../test-fixtures/coverage/lcov.info');
    const result = parser.parseLcov(filePath);

    const buttonFile = result?.files.get('src/components/Button.js');
    assert.ok(buttonFile, 'Should find Button.js');
    
    // Check specific lines
    const line1 = buttonFile?.lines.get(1);
    assert.ok(line1, 'Should have line 1');
    assert.strictEqual(line1?.hits, 5, 'Line 1 should be hit 5 times');
    
    const line7 = buttonFile?.lines.get(7);
    assert.ok(line7, 'Should have line 7');
    assert.strictEqual(line7?.hits, 0, 'Line 7 should not be hit');
  });

  test('should calculate summary statistics from LCOV', () => {
    const filePath = path.resolve(__dirname, '../../../test-fixtures/coverage/lcov.info');
    const result = parser.parseLcov(filePath);

    assert.ok(result, 'Should parse file');
    assert.ok(result?.summary.linesTotal > 0, 'Should have total lines');
    assert.ok(result?.summary.linesCovered > 0, 'Should have covered lines');
    assert.ok(result?.summary.lineRate > 0, 'Should have line rate');
    assert.ok(result?.summary.lineRate <= 1, 'Line rate should be <= 1');
  });

  test('should return null for non-existent Cobertura file', () => {
    const result = parser.parseCobertura('/non/existent/file.xml');
    assert.strictEqual(result, null, 'Should return null for non-existent file');
  });

  test('should return null for non-existent LCOV file', () => {
    const result = parser.parseLcov('/non/existent/file.info');
    assert.strictEqual(result, null, 'Should return null for non-existent file');
  });

  test('parseCoverage should try Cobertura first', () => {
    const coberturaPath = path.resolve(__dirname, '../../../test-fixtures/coverage/cobertura-coverage.xml');
    const lcovPath = path.resolve(__dirname, '../../../test-fixtures/coverage/lcov.info');
    
    const result = parser.parseCoverage(coberturaPath, lcovPath);
    
    assert.ok(result, 'Should parse coverage');
    // If Cobertura is parsed, it should have data from Cobertura
    assert.strictEqual(result?.files.size, 2, 'Should have 2 files from Cobertura');
    assert.ok(result?.files.has('src/components/Button.js'), 'Should have Button.js');
    assert.ok(result?.files.has('src/components/Input.js'), 'Should have Input.js');
  });

  test('parseCoverage should fall back to LCOV if Cobertura not available', () => {
    const lcovPath = path.resolve(__dirname, '../../../test-fixtures/coverage/lcov.info');
    
    const result = parser.parseCoverage(null, lcovPath);
    
    assert.ok(result, 'Should parse LCOV');
    assert.ok(result?.files.size > 0, 'Should have files from LCOV');
  });

  test('parseCoverage should return null if no files available', () => {
    const result = parser.parseCoverage(null, null);
    assert.strictEqual(result, null, 'Should return null when no files provided');
  });
});

