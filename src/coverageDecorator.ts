import * as vscode from 'vscode';
import * as path from 'path';
import { CoverageData, FileCoverage, LineCoverage } from './types';

export class CoverageDecorator {
  private coveredDecoration: vscode.TextEditorDecorationType;
  private uncoveredDecoration: vscode.TextEditorDecorationType;
  private partialDecoration: vscode.TextEditorDecorationType;
  private activeDecorations: vscode.TextEditorDecorationType[] = [];
  private enabled: boolean = true;

  constructor() {
    // These will be created dynamically based on hit counts
    // Placeholder decorations - will be replaced with hit-count specific ones
    this.coveredDecoration = vscode.window.createTextEditorDecorationType({});
    this.uncoveredDecoration = vscode.window.createTextEditorDecorationType({});
    this.partialDecoration = vscode.window.createTextEditorDecorationType({});
  }

  private createCoverageIcon(hits: number, isPartial: boolean = false): vscode.Uri {
    let color: string;
    let bgColor: string;
    let text: string;

    if (hits === 0) {
      // Red for uncovered - no number displayed
      color = '#ffffff';
      bgColor = '#e53935';
      text = '';  // No text for uncovered lines
    } else if (isPartial) {
      // Orange for partial coverage
      color = '#ffffff';
      bgColor = '#ff9800';
      text = hits >= 100 ? '99+' : hits.toString();
    } else {
      // Green for covered
      color = '#ffffff';
      bgColor = '#4caf50';
      text = hits >= 100 ? '99+' : hits.toString();
    }

    // Create a prominent badge similar to Istanbul
    // For uncovered lines (no text), show a solid red indicator
    const svg = hits === 0 
      ? `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" viewBox="0 0 24 16">
           <!-- Background rounded rectangle -->
          <rect x="1" y="2" width="22" height="12" rx="2" fill="${bgColor}" opacity="0.95"/>
        </svg>
      `
      : `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" viewBox="0 0 24 16">
          <!-- Background rounded rectangle -->
          <rect x="1" y="2" width="22" height="12" rx="2" fill="${bgColor}" opacity="0.95"/>
          <!-- White text showing hit count -->
          <text x="12" y="11" 
                font-family="Arial, sans-serif" 
                font-size="9" 
                font-weight="bold"
                fill="${color}" 
                text-anchor="middle">${text}x</text>
        </svg>
      `;
    return vscode.Uri.parse(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
  }

  private createLineIcon(color: string, strokeWidth: number = 2): vscode.Uri {
    // Old simple line icon - keeping for reference but not used
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <line x1="2" y1="2" x2="2" y2="14" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
      </svg>
    `;
    return vscode.Uri.parse(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
  }

  private createGutterIcon(text: string, color: string): vscode.Uri {
    // Not used anymore, but keeping for potential future use
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" fill="${color}" opacity="0.8"/>
        <text x="8" y="12" font-size="10" fill="white" text-anchor="middle" font-family="Arial">${text}</text>
      </svg>
    `;
    return vscode.Uri.parse(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
  }

  /**
   * Apply coverage decorations to the active editor
   */
  public updateDecorations(
    editor: vscode.TextEditor,
    allCoverageData: Map<string, CoverageData>,
    workspaceRoot: string
  ): void {
    if (!this.enabled) {
      this.clearDecorations(editor);
      return;
    }

    const filePath = editor.document.uri.fsPath;
    
    // Find coverage data for this file
    const fileCoverage = this.findFileCoverage(filePath, allCoverageData, workspaceRoot);
    
    if (!fileCoverage) {
      // No coverage for this file
      this.clearDecorations(editor);
      return;
    }

    // Group lines by hit count to minimize decoration types
    const decorationsByHits = new Map<string, vscode.DecorationOptions[]>();

    // Process each covered line
    for (const [lineNumber, lineCoverage] of fileCoverage.lines) {
      // VS Code lines are 0-indexed, coverage data is 1-indexed
      const line = lineNumber - 1;
      
      if (line < 0 || line >= editor.document.lineCount) {
        continue;
      }

      const range = new vscode.Range(line, 0, line, 0);
      const hoverMessage = this.createHoverMessage(lineCoverage);

      // Determine the decoration key based on hits and coverage type
      let decorationKey: string;
      let isPartial = false;

      if (lineCoverage.hits === 0) {
        decorationKey = 'uncovered-0';
      } else if (lineCoverage.branch && lineCoverage.conditionCoverage) {
        // Check if branch is partially covered
        const match = lineCoverage.conditionCoverage.match(/(\d+)%/);
        const percentage = match ? parseInt(match[1]) : 100;
        
        if (percentage < 100) {
          isPartial = true;
          decorationKey = `partial-${lineCoverage.hits}`;
        } else {
          decorationKey = `covered-${lineCoverage.hits}`;
        }
      } else {
        decorationKey = `covered-${lineCoverage.hits}`;
      }

      // Store for later application
      if (!decorationsByHits.has(decorationKey)) {
        decorationsByHits.set(decorationKey, []);
      }
      decorationsByHits.get(decorationKey)!.push({ range, hoverMessage });
    }

    // Apply decorations grouped by hit count
    for (const [decorationKey, ranges] of decorationsByHits) {
      const [type, hitsStr] = decorationKey.split('-');
      const hits = parseInt(hitsStr);
      const isPartial = type === 'partial';
      const isUncovered = type === 'uncovered';

      // Create decoration type for this hit count
      const decorationType = vscode.window.createTextEditorDecorationType({
        isWholeLine: false,
        gutterIconPath: this.createCoverageIcon(hits, isPartial),
        gutterIconSize: 'contain',
        overviewRulerColor: isUncovered 
          ? 'rgba(244, 67, 54, 0.8)' 
          : isPartial 
            ? 'rgba(255, 152, 0, 0.8)'
            : 'rgba(76, 175, 80, 0.8)',
        overviewRulerLane: vscode.OverviewRulerLane.Left
      });

      editor.setDecorations(decorationType, ranges);
      
      // Store for cleanup
      this.activeDecorations.push(decorationType);
    }

    console.log(`Applied ${decorationsByHits.size} different coverage decorations to ${path.basename(filePath)}`);
  }

  /**
   * Find coverage data for a specific file
   */
  private findFileCoverage(
    filePath: string,
    allCoverageData: Map<string, CoverageData>,
    workspaceRoot: string
  ): FileCoverage | null {
    const normalizedPath = this.normalizePath(filePath, workspaceRoot);

    // Search through all coverage data
    for (const coverageData of allCoverageData.values()) {
      for (const [coveredFile, fileCoverage] of coverageData.files) {
        const normalizedCoveredFile = this.normalizePath(coveredFile, workspaceRoot);
        
        if (normalizedPath.endsWith(normalizedCoveredFile) || 
            normalizedCoveredFile.endsWith(normalizedPath) ||
            normalizedPath === normalizedCoveredFile) {
          return fileCoverage;
        }
      }
    }

    return null;
  }

  /**
   * Normalize file paths for comparison
   */
  private normalizePath(filePath: string, workspaceRoot: string): string {
    // Make relative to workspace if absolute
    let normalized = filePath;
    if (path.isAbsolute(filePath) && filePath.startsWith(workspaceRoot)) {
      normalized = path.relative(workspaceRoot, filePath);
    }
    
    // Normalize separators
    return normalized.replace(/\\/g, '/');
  }

  /**
   * Create hover message for a line - shows on gutter icon and line hover
   */
  private createHoverMessage(lineCoverage: LineCoverage): vscode.MarkdownString {
    const message = new vscode.MarkdownString();
    message.isTrusted = true;
    message.supportHtml = true;

    if (lineCoverage.hits > 0) {
      // Covered line
      message.appendMarkdown(`### $(pass) Line Covered\n\n`);
      message.appendMarkdown(`**Execution Count:** ${lineCoverage.hits} time${lineCoverage.hits !== 1 ? 's' : ''}\n\n`);
      
      if (lineCoverage.branch && lineCoverage.conditionCoverage) {
        // Has branch coverage info
        const match = lineCoverage.conditionCoverage.match(/(\d+)%\s*\((\d+)\/(\d+)\)/);
        if (match) {
          const percentage = match[1];
          const covered = match[2];
          const total = match[3];
          
          message.appendMarkdown(`**Branch Coverage:** ${percentage}% (${covered}/${total} branches)\n\n`);
          
          if (parseInt(percentage) < 100) {
            message.appendMarkdown(`$(warning) *Some branches not covered*\n\n`);
            message.appendMarkdown(`Add tests for missing conditional paths`);
          } else {
            message.appendMarkdown(`$(check) *All branches covered*`);
          }
        } else {
          message.appendMarkdown(`**Branch Coverage:** ${lineCoverage.conditionCoverage}\n\n`);
        }
      } else {
        message.appendMarkdown(`$(check) *This line is well tested*`);
      }
    } else {
      // Uncovered line
      message.appendMarkdown(`### $(error) Line Not Covered\n\n`);
      message.appendMarkdown(`**Execution Count:** 0 (never executed)\n\n`);
      message.appendMarkdown(`$(warning) This line was not executed during tests.\n\n`);
      message.appendMarkdown(`**Suggestions:**\n`);
      message.appendMarkdown(`- Add a test case that exercises this code path\n`);
      message.appendMarkdown(`- Check if this code is reachable\n`);
      message.appendMarkdown(`- Consider removing dead code if unreachable`);
    }

    return message;
  }

  /**
   * Clear all decorations from an editor
   */
  public clearDecorations(editor: vscode.TextEditor): void {
    // Clear old static decorations (legacy)
    editor.setDecorations(this.coveredDecoration, []);
    editor.setDecorations(this.uncoveredDecoration, []);
    editor.setDecorations(this.partialDecoration, []);
    
    // Clear all dynamic decorations and dispose them
    for (const decoration of this.activeDecorations) {
      editor.setDecorations(decoration, []);
      decoration.dispose();
    }
    this.activeDecorations = [];
  }

  /**
   * Clear all decorations from all editors
   */
  public clearAllDecorations(): void {
    vscode.window.visibleTextEditors.forEach(editor => {
      this.clearDecorations(editor);
    });
  }

  /**
   * Toggle coverage display on/off
   */
  public toggle(): boolean {
    this.enabled = !this.enabled;
    
    if (!this.enabled) {
      this.clearAllDecorations();
    }
    
    return this.enabled;
  }

  /**
   * Check if coverage display is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Dispose of decorations
   */
  public dispose(): void {
    this.coveredDecoration.dispose();
    this.uncoveredDecoration.dispose();
    this.partialDecoration.dispose();
    
    // Dispose all active decorations
    for (const decoration of this.activeDecorations) {
      decoration.dispose();
    }
    this.activeDecorations = [];
  }
}

