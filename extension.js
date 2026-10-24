// Evals Review Tools: opens two single-file HTML tools inside a VS Code panel.
// The panel can't read or write your disk by itself, so this file does the file
// dialogs, the saving of your progress, and the confirmation pop-ups for it.

const vscode = require('vscode');
const path = require('path');
const crypto = require('crypto');

const TOOLS = {
  trace: {
    title: 'Trace Reviewer',
    file: 'trace-reviewer.html',
    allowMany: false,
  },
  judge: {
    title: 'Judge Reviewer',
    file: 'judge-reviewer.html',
    allowMany: true,
  },
};

// Keys the tools use to save your progress (see the LS variable in each HTML file).
const STATE_PREFIXES = ['evalreview:', 'judgereview:'];

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('evalReview.openTraceReviewer', () => openTool(context, 'trace')),
    vscode.commands.registerCommand('evalReview.openJudgeReviewer', () => openTool(context, 'judge'))
  );
}

async function getHtml(context, fileName) {
  const uri = vscode.Uri.joinPath(context.extensionUri, 'media', fileName);
  const bytes = await vscode.workspace.fs.readFile(uri);
  let html = Buffer.from(bytes).toString('utf8');

  // Webviews run under a strict content security policy: only our one inline script is allowed.
  const nonce = crypto.randomBytes(16).toString('base64');
  const csp = [
    "default-src 'none'",
    'img-src data:',
    "style-src 'unsafe-inline'",
    `script-src 'nonce-${nonce}'`,
  ].join('; ');

  html = html.replace('<head>', `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`);
  html = html.replace('<script>', `<script nonce="${nonce}">`);
  return html;
}

function savedProgress(context) {
  const saved = {};
  for (const key of context.workspaceState.keys()) {
    if (STATE_PREFIXES.some((p) => key.startsWith(p))) {
      saved[key] = context.workspaceState.get(key);
    }
  }
  return saved;
}

async function openTool(context, which) {
  const tool = TOOLS[which];
  const panel = vscode.window.createWebviewPanel(
    `evalReview.${which}`,
    tool.title,
    vscode.ViewColumn.Active,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  panel.webview.html = await getHtml(context, tool.file);

  // Remember the folder of the last opened file so Save starts there.
  let lastDir;
  const send = (message) => {
    try { panel.webview.postMessage(message); } catch (e) { /* panel was closed */ }
  };

  panel.webview.onDidReceiveMessage(async (msg) => {
    try {
      switch (msg.type) {
        case 'openFiles': {
          const defaultUri = lastDir || (vscode.workspace.workspaceFolders || [])[0]?.uri;
          const uris = await vscode.window.showOpenDialog({
            canSelectMany: tool.allowMany,
            filters: { 'CSV files': ['csv'] },
            defaultUri,
            openLabel: 'Open',
            title: tool.allowMany
              ? 'Select your judge results CSV and your labeled results CSV'
              : 'Select a results CSV',
          });
          if (!uris || !uris.length) return;
          lastDir = vscode.Uri.joinPath(uris[0], '..');
          const files = [];
          for (const uri of uris) {
            const bytes = await vscode.workspace.fs.readFile(uri);
            files.push({ name: path.basename(uri.path), text: Buffer.from(bytes).toString('utf8') });
          }
          send({ type: 'files', files, saved: savedProgress(context) });
          break;
        }
        case 'export': {
          const base = lastDir || (vscode.workspace.workspaceFolders || [])[0]?.uri;
          const defaultUri = base ? vscode.Uri.joinPath(base, msg.filename) : undefined;
          const uri = await vscode.window.showSaveDialog({
            defaultUri,
            filters: { 'CSV files': ['csv'] },
            saveLabel: 'Save',
          });
          if (!uri) return;
          await vscode.workspace.fs.writeFile(uri, Buffer.from(msg.text, 'utf8'));
          vscode.window.showInformationMessage(`Saved ${path.basename(uri.path)}`);
          break;
        }
        case 'saveState':
          await context.workspaceState.update(msg.key, msg.value);
          break;
        case 'removeState':
          await context.workspaceState.update(msg.key, undefined);
          break;
        case 'confirm': {
          const pick = await vscode.window.showWarningMessage(msg.message, { modal: true }, 'Continue');
          send({ type: 'confirmResult', id: msg.id, ok: pick === 'Continue' });
          break;
        }
        case 'notify':
          if (msg.level === 'error') vscode.window.showErrorMessage(msg.message);
          else vscode.window.showInformationMessage(msg.message);
          break;
      }
    } catch (err) {
      vscode.window.showErrorMessage(`Evals Review Tools: ${err && err.message ? err.message : err}`);
    }
  }, undefined, context.subscriptions);
}

function deactivate() {}

module.exports = { activate, deactivate };
