import * as vscode from 'vscode';
import { CoverageStatus } from './types';

export class StatusBarManager {
  private item: vscode.StatusBarItem;
  private currentStatus: CoverageStatus = 'inactive';
  private clickCount: number = 0;
  private clickTimer: NodeJS.Timeout | null = null;
  private onSingleClick?: () => void;
  private onDoubleClick?: () => void;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    // Remove the command - we'll handle clicks manually
    this.item.command = undefined;
    this.update('inactive');
    this.item.show();
  }

  /**
   * Set click handlers
   */
  public setClickHandlers(
    onSingleClick: () => void,
    onDoubleClick: () => void
  ): void {
    this.onSingleClick = onSingleClick;
    this.onDoubleClick = onDoubleClick;
  }

  /**
   * Create a command that detects single vs double click
   */
  public getClickCommand(): string {
    return 'karmaCoverage.statusBarClick';
  }

  /**
   * Handle status bar click
   */
  public handleClick(): void {
    this.clickCount++;

    if (this.clickTimer) {
      clearTimeout(this.clickTimer);
      this.clickTimer = null;
    }

    if (this.clickCount === 1) {
      // Wait to see if it's a double click
      this.clickTimer = setTimeout(() => {
        // Single click
        if (this.onSingleClick) {
          this.onSingleClick();
        }
        this.clickCount = 0;
        this.clickTimer = null;
      }, 300); // 300ms delay to detect double click
    } else if (this.clickCount === 2) {
      // Double click
      if (this.onDoubleClick) {
        this.onDoubleClick();
      }
      this.clickCount = 0;
      this.clickTimer = null;
    }
  }

  public update(status: CoverageStatus, details?: string): void {
    this.currentStatus = status;
    this.item.command = 'karmaCoverage.statusBarClick'; // Set click handler

    switch (status) {
      case 'inactive':
        this.item.text = '$(circle-slash) No Karma Config';
        this.item.tooltip = 'No karma config found\n\nClick: Toggle coverage\nDouble-click: Refresh';
        this.item.color = undefined;
        this.item.backgroundColor = undefined;
        break;

      case 'found':
        this.item.text = '$(check) Karma: Ready';
        this.item.tooltip = `${details || 'Karma config found'}\n\nClick: Toggle coverage\nDouble-click: Refresh`;
        this.item.color = undefined;
        this.item.backgroundColor = undefined;
        break;

      case 'not_computed':
        this.item.text = '$(clock) Coverage: Not Computed';
        this.item.tooltip = `${details || 'Run tests to generate coverage'}\n\nClick: Toggle coverage\nDouble-click: Refresh`;
        this.item.color = new vscode.ThemeColor('statusBarItem.warningForeground');
        this.item.backgroundColor = undefined;
        break;

      case 'loading':
        this.item.text = '$(loading~spin) Loading Coverage...';
        this.item.tooltip = 'Parsing coverage file...\n\nClick: Toggle coverage\nDouble-click: Refresh';
        this.item.color = undefined;
        this.item.backgroundColor = undefined;
        break;

      case 'active':
        this.item.text = `$(shield) Coverage: ${details || 'N/A'}`;
        this.item.tooltip = `${details || 'Coverage data loaded'}\n\nClick: Toggle coverage display\nDouble-click: Refresh and show details`;
        this.item.color = undefined;
        this.item.backgroundColor = undefined;
        break;

      case 'error':
        this.item.text = '$(warning) Coverage Error';
        this.item.tooltip = `${details || 'Error loading coverage'}\n\nClick: Toggle coverage\nDouble-click: Refresh`;
        this.item.color = new vscode.ThemeColor('statusBarItem.errorForeground');
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
    }
  }

  public dispose(): void {
    this.item.dispose();
  }
}

