import * as vscode from 'vscode';

export interface KarmaConfig {
  configPath: string;
  coverageDir?: string;
  reporters?: Array<{
    type: string;
    subdir?: string;
    file?: string;
  }>;
}

export type CoverageStatus = 'inactive' | 'found' | 'not_computed' | 'loading' | 'active' | 'error';

export interface FileCoverage {
  filename: string;
  lineRate: number;
  branchRate: number;
  lines: Map<number, LineCoverage>;
}

export interface LineCoverage {
  lineNumber: number;
  hits: number;
  branch: boolean;
  conditionCoverage?: string;
}

export interface CoverageData {
  files: Map<string, FileCoverage>;
  summary: CoverageSummary;
}

export interface CoverageSummary {
  linesCovered: number;
  linesTotal: number;
  lineRate: number;
  branchesCovered: number;
  branchesTotal: number;
  branchRate: number;
}

