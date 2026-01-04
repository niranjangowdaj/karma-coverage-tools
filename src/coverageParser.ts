import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { CoverageData, FileCoverage, LineCoverage, CoverageSummary } from './types';

export class CoverageParser {
  /**
   * Parse a Cobertura XML coverage file
   * @param filePath Path to the Cobertura XML file
   * @param configDir Directory containing the karma config (for resolving relative paths)
   */
  public parseCobertura(filePath: string, configDir?: string): CoverageData | null {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`Cobertura file not found: ${filePath}`);
        return null;
      }

      const xmlContent = fs.readFileSync(filePath, 'utf-8');
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
      });

      const result = parser.parse(xmlContent);
      
      if (!result.coverage) {
        console.error('Invalid Cobertura XML: no coverage element');
        return null;
      }

      const files = new Map<string, FileCoverage>();
      let totalLinesCovered = 0;
      let totalLinesValid = 0;
      let totalBranchesCovered = 0;
      let totalBranchesValid = 0;

      // Parse packages
      const packages = Array.isArray(result.coverage.packages?.package)
        ? result.coverage.packages.package
        : result.coverage.packages?.package
        ? [result.coverage.packages.package]
        : [];

      for (const pkg of packages) {
        const classes = Array.isArray(pkg.classes?.class)
          ? pkg.classes.class
          : pkg.classes?.class
          ? [pkg.classes.class]
          : [];

        for (const cls of classes) {
          let filename = cls['@_filename'];
          
          // Resolve filename relative to karma config directory if provided
          if (configDir && !path.isAbsolute(filename)) {
            filename = path.resolve(configDir, filename);
          }
          
          const lineRate = parseFloat(cls['@_line-rate'] || '0');
          const branchRate = parseFloat(cls['@_branch-rate'] || '0');

          const lineMap = new Map<number, LineCoverage>();

          // Parse lines
          const lines = Array.isArray(cls.lines?.line)
            ? cls.lines.line
            : cls.lines?.line
            ? [cls.lines.line]
            : [];

          for (const line of lines) {
            const lineNumber = parseInt(line['@_number']);
            const hits = parseInt(line['@_hits']);
            const branch = line['@_branch'] === 'true';
            const conditionCoverage = line['@_condition-coverage'];

            lineMap.set(lineNumber, {
              lineNumber,
              hits,
              branch,
              conditionCoverage
            });

            if (hits > 0) {
              totalLinesCovered++;
            }
            totalLinesValid++;

            // Count branches
            if (branch && conditionCoverage) {
              const match = conditionCoverage.match(/(\d+)\/(\d+)/);
              if (match) {
                totalBranchesCovered += parseInt(match[1]);
                totalBranchesValid += parseInt(match[2]);
              }
            }
          }

          files.set(filename, {
            filename,
            lineRate,
            branchRate,
            lines: lineMap
          });
        }
      }

      const summary: CoverageSummary = {
        linesCovered: totalLinesCovered,
        linesTotal: totalLinesValid,
        lineRate: totalLinesValid > 0 ? totalLinesCovered / totalLinesValid : 0,
        branchesCovered: totalBranchesCovered,
        branchesTotal: totalBranchesValid,
        branchRate: totalBranchesValid > 0 ? totalBranchesCovered / totalBranchesValid : 0
      };

      console.log(`Parsed Cobertura: ${files.size} files, ${(summary.lineRate * 100).toFixed(1)}% line coverage`);

      return {
        files,
        summary
      };
    } catch (error) {
      console.error('Error parsing Cobertura file:', error);
      return null;
    }
  }

  /**
   * Parse an LCOV format coverage file
   * @param filePath Path to the LCOV file
   * @param configDir Directory containing the karma config (for resolving relative paths)
   */
  public parseLcov(filePath: string, configDir?: string): CoverageData | null {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`LCOV file not found: ${filePath}`);
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      const files = new Map<string, FileCoverage>();
      let currentFile: string | null = null;
      let currentLines = new Map<number, LineCoverage>();
      let totalLinesCovered = 0;
      let totalLinesValid = 0;
      let totalBranchesCovered = 0;
      let totalBranchesValid = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('SF:')) {
          // Source file
          currentFile = trimmed.substring(3);
          
          // Resolve filename relative to karma config directory if provided
          if (configDir && currentFile && !path.isAbsolute(currentFile)) {
            currentFile = path.resolve(configDir, currentFile);
          }
          
          currentLines = new Map();
        } else if (trimmed.startsWith('DA:')) {
          // Line data: DA:line,hits
          const parts = trimmed.substring(3).split(',');
          const lineNumber = parseInt(parts[0]);
          const hits = parseInt(parts[1]);

          currentLines.set(lineNumber, {
            lineNumber,
            hits,
            branch: false
          });

          if (hits > 0) {
            totalLinesCovered++;
          }
          totalLinesValid++;
        } else if (trimmed.startsWith('BRDA:')) {
          // Branch data: BRDA:line,block,branch,taken
          const parts = trimmed.substring(5).split(',');
          const lineNumber = parseInt(parts[0]);
          const taken = parts[3] !== '0' && parts[3] !== '-';

          // Mark line as having branches
          const existing = currentLines.get(lineNumber);
          if (existing) {
            existing.branch = true;
          }

          totalBranchesValid++;
          if (taken) {
            totalBranchesCovered++;
          }
        } else if (trimmed === 'end_of_record' && currentFile) {
          // End of file record
          const linesCovered = Array.from(currentLines.values()).filter(l => l.hits > 0).length;
          const linesTotal = currentLines.size;

          files.set(currentFile, {
            filename: currentFile,
            lineRate: linesTotal > 0 ? linesCovered / linesTotal : 0,
            branchRate: 0, // Calculate per file if needed
            lines: currentLines
          });

          currentFile = null;
          currentLines = new Map();
        }
      }

      const summary: CoverageSummary = {
        linesCovered: totalLinesCovered,
        linesTotal: totalLinesValid,
        lineRate: totalLinesValid > 0 ? totalLinesCovered / totalLinesValid : 0,
        branchesCovered: totalBranchesCovered,
        branchesTotal: totalBranchesValid,
        branchRate: totalBranchesValid > 0 ? totalBranchesCovered / totalBranchesValid : 0
      };

      console.log(`Parsed LCOV: ${files.size} files, ${(summary.lineRate * 100).toFixed(1)}% line coverage`);

      return {
        files,
        summary
      };
    } catch (error) {
      console.error('Error parsing LCOV file:', error);
      return null;
    }
  }

  /**
   * Try to parse coverage from either Cobertura or LCOV
   * @param coberturaPath Path to Cobertura XML file
   * @param lcovPath Path to LCOV file
   * @param configDir Directory containing the karma config (for resolving relative paths)
   */
  public parseCoverage(coberturaPath?: string | null, lcovPath?: string | null, configDir?: string): CoverageData | null {
    // Try Cobertura first
    if (coberturaPath) {
      const data = this.parseCobertura(coberturaPath, configDir);
      if (data) {
        return data;
      }
    }

    // Fall back to LCOV
    if (lcovPath) {
      const data = this.parseLcov(lcovPath, configDir);
      if (data) {
        return data;
      }
    }

    return null;
  }
}

