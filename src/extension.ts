import * as vscode from 'vscode';
import * as path from 'path';
import { StatusBarManager } from './statusBar';
import { KarmaConfigDetector } from './karmaConfigDetector';
import { CoverageParser } from './coverageParser';
import { CoverageDecorator } from './coverageDecorator';
import { KarmaConfig, CoverageData } from './types';

let statusBar: StatusBarManager;
let detector: KarmaConfigDetector;
let parser: CoverageParser;
let decorator: CoverageDecorator;
let allConfigs: KarmaConfig[] = []; // Track ALL configs with coverage
let coverageData: Map<string, CoverageData> = new Map(); // Coverage data per config
let fileWatchers: vscode.FileSystemWatcher[] = [];
let workspaceRoot: string | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Karma Coverage Tools extension is now active!');

  // Initialize components
  statusBar = new StatusBarManager();
  detector = new KarmaConfigDetector();
  parser = new CoverageParser();
  decorator = new CoverageDecorator();
  workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  
  // Set up status bar click handlers
  statusBar.setClickHandlers(
    () => handleToggle(),      // Single click = toggle
    () => handleRefresh()      // Double click = refresh
  );
  
  // Show first-time usage tip
  const hasSeenTip = context.globalState.get('hasSeenCoverageTip', false);
  if (!hasSeenTip) {
    vscode.window.showInformationMessage(
      '💡 Tip: Click status bar to toggle coverage, double-click to refresh and see details!',
      'Got it!'
    ).then(() => {
      context.globalState.update('hasSeenCoverageTip', true);
    });
  }
  
  // Register commands
  const statusBarClickCommand = vscode.commands.registerCommand(
    'karmaCoverage.statusBarClick',
    () => statusBar.handleClick()
  );

  const refreshCommand = vscode.commands.registerCommand(
    'karmaCoverage.refresh',
    () => handleRefresh()
  );

  const toggleCommand = vscode.commands.registerCommand(
    'karmaCoverage.toggle',
    () => handleToggle()
  );

  const runTestsCommand = vscode.commands.registerCommand(
    'karmaCoverage.runTests',
    () => handleRunTests()
  );

  context.subscriptions.push(statusBar, decorator, statusBarClickCommand, refreshCommand, toggleCommand, runTestsCommand);

  // Initial scan for karma configs
  scanForKarmaConfig();

  // Watch for workspace changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/*conf.js');
  watcher.onDidCreate(() => scanForKarmaConfig());
  watcher.onDidChange(() => scanForKarmaConfig());
  watcher.onDidDelete(() => scanForKarmaConfig());
  context.subscriptions.push(watcher);

  // Update decorations when active editor changes
  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor && workspaceRoot) {
      decorator.updateDecorations(editor, coverageData, workspaceRoot);
    }
  }, null, context.subscriptions);

  // Update decorations when document changes
  vscode.workspace.onDidChangeTextDocument(event => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document === event.document && workspaceRoot) {
      decorator.updateDecorations(editor, coverageData, workspaceRoot);
    }
  }, null, context.subscriptions);

  // Apply decorations to currently active editor
  if (vscode.window.activeTextEditor && workspaceRoot) {
    decorator.updateDecorations(vscode.window.activeTextEditor, coverageData, workspaceRoot);
  }
}

async function scanForKarmaConfig() {
  try {
    const configUris = await detector.findKarmaConfigs();

    if (configUris.length === 0) {
      statusBar.update('inactive');
      allConfigs = [];
      coverageData.clear();
      return;
    }

    console.log(`Found ${configUris.length} *conf.js file(s), parsing...`);

    // Parse all configs and filter to only those with coverageReporter
    const parsedConfigs: KarmaConfig[] = [];
    for (const configUri of configUris) {
      const parsed = await detector.parseConfig(configUri);
      if (parsed && parsed.coverageDir) {
        // Only include configs that have coverageReporter configured
        parsedConfigs.push(parsed);
        console.log(`✓ ${vscode.workspace.asRelativePath(configUri)} has coverageReporter`);
      } else if (parsed) {
        console.log(`✗ ${vscode.workspace.asRelativePath(configUri)} has no coverageReporter - skipping`);
      }
    }

    if (parsedConfigs.length === 0) {
      statusBar.update('inactive', 'No karma configs with coverageReporter found');
      allConfigs = [];
      coverageData.clear();
      console.log('No karma configs with coverageReporter found');
      return;
    }

    // Store ALL configs for monorepo support
    allConfigs = parsedConfigs;
    console.log(`📦 Monorepo: Found ${allConfigs.length} karma config(s) with coverage`);

    // Parse coverage for each config
    await loadCoverageForAllConfigs();

    // Set up file watchers for coverage files
    setupCoverageFileWatchers();
  } catch (error) {
    console.error('Error scanning for karma config:', error);
    statusBar.update('error', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function loadCoverageForAllConfigs() {
  coverageData.clear();
  
  let configsWithCoverage = 0;
  let totalLinesCovered = 0;
  let totalLinesTotal = 0;

  for (const config of allConfigs) {
    const configName = vscode.workspace.asRelativePath(config.configPath);
    const configDir = path.dirname(config.configPath); // Get config directory for path resolution
    
    const coberturaPath = detector.getCoverageFilePath(config, 'cobertura');
    const lcovPath = detector.getCoverageFilePath(config, 'lcov');

    // Try to parse coverage - pass configDir for proper path resolution
    const data = parser.parseCoverage(coberturaPath, lcovPath, configDir);
    
    if (data) {
      coverageData.set(config.configPath, data);
      configsWithCoverage++;
      totalLinesCovered += data.summary.linesCovered;
      totalLinesTotal += data.summary.linesTotal;
      
      console.log(`  ✅ ${configName} - ${(data.summary.lineRate * 100).toFixed(1)}% coverage (${data.summary.linesCovered}/${data.summary.linesTotal} lines)`);
    } else {
      console.log(`  ❌ ${configName} - No coverage files found`);
    }
    
    console.log(`     Config dir: ${configDir}`);
    console.log(`     Coverage dir: ${config.coverageDir}`);
    console.log(`     Cobertura: ${coberturaPath ? vscode.workspace.asRelativePath(coberturaPath) : 'N/A'}`);
    console.log(`     LCOV: ${lcovPath ? vscode.workspace.asRelativePath(lcovPath) : 'N/A'}`);
  }

  // Update status bar with aggregate coverage
  if (configsWithCoverage === 0) {
    // No coverage found
    const summary = allConfigs.length === 1
      ? 'Run tests to generate coverage'
      : `${allConfigs.length} configs - Run tests to generate coverage`;
    statusBar.update('not_computed', summary);
  } else {
    // Calculate overall coverage percentage
    const overallRate = totalLinesTotal > 0 ? (totalLinesCovered / totalLinesTotal) * 100 : 0;
    
    if (configsWithCoverage === allConfigs.length) {
      // All configs have coverage
      const summary = allConfigs.length === 1
        ? `${overallRate.toFixed(1)}%`
        : `${overallRate.toFixed(1)}% (${allConfigs.length} configs)`;
      statusBar.update('active', summary);
    } else {
      // Partial coverage
      const summary = `${overallRate.toFixed(1)}% (${configsWithCoverage}/${allConfigs.length} configs)`;
      statusBar.update('active', summary);
    }
  }

  // Update decorations for active editor
  if (vscode.window.activeTextEditor && workspaceRoot) {
    decorator.updateDecorations(vscode.window.activeTextEditor, coverageData, workspaceRoot);
  }
}

function setupCoverageFileWatchers() {
  // Dispose existing watchers
  fileWatchers.forEach(w => w.dispose());
  fileWatchers = [];

  // Create watchers for each coverage directory
  for (const config of allConfigs) {
    if (!config.coverageDir) {
      continue;
    }

    // Watch for XML files (Cobertura)
    const xmlPattern = new vscode.RelativePattern(
      vscode.workspace.workspaceFolders![0],
      `${config.coverageDir}/**/*.xml`
    );
    const xmlWatcher = vscode.workspace.createFileSystemWatcher(xmlPattern);
    xmlWatcher.onDidCreate(() => loadCoverageForAllConfigs());
    xmlWatcher.onDidChange(() => loadCoverageForAllConfigs());
    xmlWatcher.onDidDelete(() => loadCoverageForAllConfigs());
    fileWatchers.push(xmlWatcher);

    // Watch for LCOV files
    const lcovPattern = new vscode.RelativePattern(
      vscode.workspace.workspaceFolders![0],
      `${config.coverageDir}/**/lcov.info`
    );
    const lcovWatcher = vscode.workspace.createFileSystemWatcher(lcovPattern);
    lcovWatcher.onDidCreate(() => loadCoverageForAllConfigs());
    lcovWatcher.onDidChange(() => loadCoverageForAllConfigs());
    lcovWatcher.onDidDelete(() => loadCoverageForAllConfigs());
    fileWatchers.push(lcovWatcher);
  }

  console.log(`Set up ${fileWatchers.length} file watchers for coverage files`);
}

async function handleRefresh() {
  // Re-scan and reload coverage
  await scanForKarmaConfig();

  if (allConfigs.length === 0) {
    vscode.window.showInformationMessage(
      'No Karma config with coverageReporter found. Make sure your karma configs have coverageReporter configured.'
    );
    return;
  }

  // Build detailed message with all coverage types
  const messages: string[] = [];
  
  if (allConfigs.length === 1) {
    // Single config - show detailed coverage breakdown
    const config = allConfigs[0];
    const configName = vscode.workspace.asRelativePath(config.configPath);
    const data = coverageData.get(config.configPath);

    messages.push(
      `📋 Config: ${configName}`,
      `📁 Dir: ${config.coverageDir}`,
      `🔧 Reporters: ${config.reporters?.map(r => r.type).join(', ') || 'none'}`,
      ''
    );

    if (data) {
      // Coverage Types Breakdown
      messages.push(
        '📊 COVERAGE BREAKDOWN:',
        '',
        '📈 Line Coverage:',
        `   ${data.summary.linesCovered} / ${data.summary.linesTotal} lines covered`,
        `   ${(data.summary.lineRate * 100).toFixed(2)}%`,
        ''
      );

      if (data.summary.branchesTotal > 0) {
        messages.push(
          '🔀 Branch Coverage:',
          `   ${data.summary.branchesCovered} / ${data.summary.branchesTotal} branches covered`,
          `   ${(data.summary.branchRate * 100).toFixed(2)}%`,
          ''
        );
      }

      messages.push(
        '📄 Files:',
        `   ${data.files.size} files with coverage data`,
        ''
      );

      // Show top 5 files by coverage
      const filesArray = Array.from(data.files.values())
        .sort((a, b) => b.lineRate - a.lineRate)
        .slice(0, 5);

      if (filesArray.length > 0) {
        messages.push('🏆 Top Coverage Files:');
        filesArray.forEach((file, idx) => {
          const shortName = file.filename.split('/').pop() || file.filename;
          messages.push(
            `   ${idx + 1}. ${shortName}: ${(file.lineRate * 100).toFixed(1)}%`
          );
        });
        messages.push('');
      }

      // Show bottom 5 files (need improvement)
      const bottomFiles = Array.from(data.files.values())
        .sort((a, b) => a.lineRate - b.lineRate)
        .slice(0, 5);

      if (bottomFiles.length > 0 && bottomFiles[0].lineRate < 0.8) {
        messages.push('⚠️  Files Needing Improvement:');
        bottomFiles.forEach((file, idx) => {
          const shortName = file.filename.split('/').pop() || file.filename;
          const percentage = (file.lineRate * 100).toFixed(1);
          if (parseFloat(percentage) < 80) {
            messages.push(
              `   ${idx + 1}. ${shortName}: ${percentage}%`
            );
          }
        });
        messages.push('');
      }
    } else {
      messages.push(
        '❌ No Coverage Data',
        'Run tests to generate coverage files',
        ''
      );
    }

    // Show file paths
    const coberturaPath = detector.getCoverageFilePath(config, 'cobertura');
    const lcovPath = detector.getCoverageFilePath(config, 'lcov');
    const coberturaExists = coberturaPath && require('fs').existsSync(coberturaPath);
    const lcovExists = lcovPath && require('fs').existsSync(lcovPath);

    messages.push(
      'Coverage Files:',
      coberturaPath ? `   ${coberturaExists ? '✅' : '❌'} Cobertura: ${vscode.workspace.asRelativePath(coberturaPath)}` : '   ❌ Cobertura: Not configured',
      lcovPath ? `   ${lcovExists ? '✅' : '❌'} LCOV: ${vscode.workspace.asRelativePath(lcovPath)}` : '   ❌ LCOV: Not configured'
    );

  } else {
    // Monorepo: Show all configs with coverage types
    messages.push(
      `📦 MONOREPO: ${allConfigs.length} Karma Configs`,
      ''
    );
    
    // Calculate aggregate stats
    let totalLinesCovered = 0;
    let totalLinesTotal = 0;
    let totalBranchesCovered = 0;
    let totalBranchesTotal = 0;
    let totalFiles = 0;
    
    for (let i = 0; i < allConfigs.length; i++) {
      const config = allConfigs[i];
      const configName = vscode.workspace.asRelativePath(config.configPath);
      const data = coverageData.get(config.configPath);
      
      if (data) {
        totalLinesCovered += data.summary.linesCovered;
        totalLinesTotal += data.summary.linesTotal;
        totalBranchesCovered += data.summary.branchesCovered;
        totalBranchesTotal += data.summary.branchesTotal;
        totalFiles += data.files.size;
        
        messages.push(
          `${i + 1}. ✅ ${configName}`,
          `   📈 Lines: ${(data.summary.lineRate * 100).toFixed(1)}% (${data.summary.linesCovered}/${data.summary.linesTotal})`
        );

        if (data.summary.branchesTotal > 0) {
          messages.push(
            `   🔀 Branches: ${(data.summary.branchRate * 100).toFixed(1)}% (${data.summary.branchesCovered}/${data.summary.branchesTotal})`
          );
        }

        messages.push(
          `   📄 Files: ${data.files.size}`
        );
      } else {
        messages.push(
          `${i + 1}. ❌ ${configName}`,
          `   No coverage data - run tests`
        );
      }
      
      if (i < allConfigs.length - 1) {
        messages.push(''); // Add spacing between configs
      }
    }

    // Add aggregate summary
    if (totalLinesTotal > 0) {
      const overallLineRate = (totalLinesCovered / totalLinesTotal) * 100;
      const overallBranchRate = totalBranchesTotal > 0 ? (totalBranchesCovered / totalBranchesTotal) * 100 : 0;
      
      messages.push(
        '',
        '═══════════════════════════',
        '📊 OVERALL COVERAGE:',
        '',
        `📈 Lines: ${overallLineRate.toFixed(2)}%`,
        `   ${totalLinesCovered} / ${totalLinesTotal} lines covered`
      );

      if (totalBranchesTotal > 0) {
        messages.push(
          '',
          `🔀 Branches: ${overallBranchRate.toFixed(2)}%`,
          `   ${totalBranchesCovered} / ${totalBranchesTotal} branches covered`
        );
      }

      messages.push(
        '',
        `📄 Total Files: ${totalFiles}`
      );
    }
  }

  const options: vscode.MessageOptions = {
    modal: true 
  }

  vscode.window.showInformationMessage(messages.filter(Boolean).join('\n'), options);
}

function handleToggle() {
  const isEnabled = decorator.toggle();
  
  if (isEnabled) {
    vscode.window.showInformationMessage('Coverage display enabled');
    
    // Refresh decorations for active editor
    if (vscode.window.activeTextEditor && workspaceRoot) {
      decorator.updateDecorations(vscode.window.activeTextEditor, coverageData, workspaceRoot);
    }
  } else {
    vscode.window.showInformationMessage('Coverage display disabled');
  }
}

async function handleRunTests() {
  if (allConfigs.length === 0) {
    vscode.window.showWarningMessage(
      'No Karma configs with coverageReporter found. Cannot run tests.'
    );
    return;
  }

  // Show status bar as loading
  statusBar.update('loading', 'Running tests...');

  // Create output channel for test results
  const outputChannel = vscode.window.createOutputChannel('Karma Coverage Tests');
  outputChannel.show();

  outputChannel.appendLine('🚀 Running Karma tests with coverage...\n');
  outputChannel.appendLine(`Found ${allConfigs.length} Karma config(s) with coverage reporter\n`);

  let successCount = 0;
  let failCount = 0;

  // Run karma for each config
  for (let i = 0; i < allConfigs.length; i++) {
    const config = allConfigs[i];
    const configName = vscode.workspace.asRelativePath(config.configPath);
    const configDir = path.dirname(config.configPath);

    outputChannel.appendLine(`${'='.repeat(80)}`);
    outputChannel.appendLine(`[${i + 1}/${allConfigs.length}] Running: ${configName}`);
    outputChannel.appendLine(`${'='.repeat(80)}\n`);

    try {
      // Run karma in headless mode with single run
      const terminal = vscode.window.createTerminal({
        name: `Karma Test ${i + 1}`,
        cwd: configDir,
        hideFromUser: false
      });

      // Check if karma is available locally or globally
      const karmaCommand = `npx karma start "${path.basename(config.configPath)}" --single-run --browsers ChromeHeadless`;
      
      outputChannel.appendLine(`Command: ${karmaCommand}`);
      outputChannel.appendLine(`Working directory: ${configDir}\n`);

      // Send command to terminal
      terminal.sendText(karmaCommand);
      terminal.show();

      // Wait a bit before moving to next config
      await new Promise(resolve => setTimeout(resolve, 1000));

      successCount++;
      outputChannel.appendLine(`Started test run for: ${configName}\n`);
    } catch (error) {
      failCount++;
      outputChannel.appendLine(`Failed to run tests for: ${configName}`);
      outputChannel.appendLine(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  outputChannel.appendLine(`\n${'='.repeat(80)}`);
  outputChannel.appendLine('📊 Summary');
  outputChannel.appendLine(`${'='.repeat(80)}`);
  outputChannel.appendLine(`Successfully started: ${successCount}`);
  if (failCount > 0) {
    outputChannel.appendLine(`Failed: ${failCount}`);
  }
  outputChannel.appendLine(`\nTests are running in separate terminals. Coverage will auto-refresh when complete.\n`);

  // Show completion message
  if (failCount === 0) {
    vscode.window.showInformationMessage(
      `Started ${allConfigs.length} Karma test run${allConfigs.length > 1 ? 's' : ''}. Check terminals for progress.`
    );
  } else {
    vscode.window.showWarningMessage(
      `Started ${successCount}/${allConfigs.length} test runs. ${failCount} failed to start.`
    );
  }

  // Restore status bar (will be updated when coverage files change)
  await loadCoverageForAllConfigs();
}

export function deactivate() {
  // Dispose status bar
  if (statusBar) {
    statusBar.dispose();
  }
  
  // Dispose file watchers
  fileWatchers.forEach(w => w.dispose());
  fileWatchers = [];
}

/**
 * Get all detected karma configs with coverage (for testing and future features)
 */
export function getAllConfigs(): KarmaConfig[] {
  return allConfigs;
}

/**
 * Get coverage data (for testing and future features)
 */
export function getCoverageData(): Map<string, CoverageData> {
  return coverageData;
}

