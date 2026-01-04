import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Extension Integration Test Suite', () => {
  test('Extension should be present', () => {
    const extension = vscode.extensions.getExtension('niranjanjgowda.karma-coverage-tools');
    assert.ok(extension, 'Extension should be installed');
  });

  test('Extension should activate', async function() {
    this.timeout(10000); // Give it time to activate
    
    const extension = vscode.extensions.getExtension('niranjanjgowda.karma-coverage-tools');
    
    if (extension) {
      await extension.activate();
      assert.ok(extension.isActive, 'Extension should be active');
    }
  });

  test('Commands should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    
    assert.ok(
      commands.includes('karmaCoverage.refresh'),
      'karmaCoverage.refresh command should be registered'
    );
    
    assert.ok(
      commands.includes('karmaCoverage.toggle'),
      'karmaCoverage.toggle command should be registered'
    );
  });

  test('Refresh command should be callable', async () => {
    // This should not throw
    await vscode.commands.executeCommand('karmaCoverage.refresh');
    assert.ok(true);
  });

  test('Toggle command should be callable', async () => {
    // This should not throw
    await vscode.commands.executeCommand('karmaCoverage.toggle');
    assert.ok(true);
  });
});

