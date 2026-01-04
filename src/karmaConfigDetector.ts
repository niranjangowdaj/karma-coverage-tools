import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as vm from 'vm';
import { KarmaConfig } from './types';

export class KarmaConfigDetector {
  private workspaceRoot: string | undefined;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  /**
   * Find all *conf.js files in the workspace (karma configs)
   */
  public async findKarmaConfigs(): Promise<vscode.Uri[]> {
    if (!this.workspaceRoot) {
      return [];
    }

    try {
      // Search for config files ending in conf.js, excluding node_modules
      const configs = await vscode.workspace.findFiles(
        '**/*conf.js',
        '**/node_modules/**',
        20 // Limit to 20 configs
      );

      return configs;
    } catch (error) {
      console.error('Error finding karma configs:', error);
      return [];
    }
  }

  /**
   * Parse a karma config file to extract coverage settings
   * Uses VM module to safely execute the karma config
   */
  public async parseConfig(configUri: vscode.Uri): Promise<KarmaConfig | null> {
    try {
      const configPath = configUri.fsPath;
      
      // Check if file exists
      if (!fs.existsSync(configPath)) {
        return null;
      }

      // Read the config file
      const configContent = fs.readFileSync(configPath, 'utf-8');

      // Create a mock config object that will be populated
      const mockConfig: any = {
        set: (config: any) => {
          Object.assign(mockConfig, config);
        }
      };

      // Create a sandbox with necessary Node.js modules
      const sandbox = {
        module: { exports: {} },
        exports: {},
        require: (moduleName: string) => {
          // Allow requiring common modules
          if (moduleName === 'path') {
            return path;
          }
          // For other requires in karma config, return empty function
          return () => {};
        },
        console,
        process,
        __dirname: path.dirname(configPath),
        __filename: configPath
      };

      // Execute the karma config file
      try {
        vm.createContext(sandbox);
        vm.runInContext(configContent, sandbox, {
          filename: configPath,
          timeout: 5000
        });

        // The config file should export a function
        const configFn = sandbox.module.exports;
        if (typeof configFn === 'function') {
          configFn(mockConfig);
        }

        // Extract coverage reporter configuration
        const coverageReporter = mockConfig.coverageReporter;
        if (!coverageReporter) {
          console.log('No coverageReporter found in karma config');
          return {
            configPath,
          };
        }

        // Log what we extracted for debugging
        console.log('Extracted coverageReporter:', {
          dir: coverageReporter.dir,
          reporters: coverageReporter.reporters?.map((r: any) => r.type)
        });

        return {
          configPath,
          coverageDir: coverageReporter.dir,
          reporters: coverageReporter.reporters || []
        };
      } catch (vmError) {
        console.error('Error executing karma config:', vmError);
        // Return basic config if parsing fails
        return {
          configPath,
        };
      }
    } catch (error) {
      console.error('Error parsing karma config:', error);
      return null;
    }
  }

  /**
   * Get the expected coverage file path based on karma config
   */
  public getCoverageFilePath(config: KarmaConfig, type: 'cobertura' | 'lcov' = 'cobertura'): string | null {
    if (!config.coverageDir) {
      return null;
    }

    // Find the reporter configuration for the requested type
    const reporter = config.reporters?.find(r => r.type === type);
    if (!reporter) {
      return null;
    }

    // Get the directory containing the karma config file
    const configDir = path.dirname(config.configPath);

    // Build the full path
    let coveragePath = config.coverageDir;
    
    // Add subdir if specified
    if (reporter.subdir) {
      coveragePath = path.join(coveragePath, reporter.subdir);
    }

    // Add filename based on type
    let filename: string;
    if (reporter.file) {
      filename = reporter.file;
    } else if (type === 'cobertura') {
      filename = 'cobertura-coverage.xml';
    } else if (type === 'lcov') {
      filename = 'lcov.info';
    } else {
      return null;
    }

    const fullPath = path.join(coveragePath, filename);

    // Make path absolute if it's relative - resolve relative to the karma config directory
    if (!path.isAbsolute(fullPath)) {
      return path.resolve(configDir, fullPath);
    }

    return fullPath;
  }

  /**
   * Check if a coverage file exists
   */
  public coverageFileExists(config: KarmaConfig): boolean {
    const coberturaPath = this.getCoverageFilePath(config, 'cobertura');
    if (coberturaPath && fs.existsSync(coberturaPath)) {
      return true;
    }

    const lcovPath = this.getCoverageFilePath(config, 'lcov');
    if (lcovPath && fs.existsSync(lcovPath)) {
      return true;
    }

    return false;
  }
}

