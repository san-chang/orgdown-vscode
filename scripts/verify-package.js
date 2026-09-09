#!/usr/bin/env node
/**
 * Pre-release smoke test for the packaged extension.
 *
 * `F5` runs with the repo's node_modules available, so a missing dependency or
 * a broken wasm lookup only surfaces after packaging. This script reproduces
 * the packaged runtime: it copies server/dist into an isolated temp directory
 * that has no node_modules, starts the language server over stdio, and asserts
 * that it answers `initialize` and initializes Tree-sitter.
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const INIT_TIMEOUT_MS = 20000;

// Files that must exist in the VSIX for the extension to work at runtime.
const REQUIRED_FILES = [
  'client/dist/extension.js',
  'client/preview/orgdown-preview.css',
  'client/preview/orgdown-preview.js',
  'server/dist/server.js',
  'server/dist/tree-sitter.wasm',
  'server/dist/tree-sitter-org.wasm',
  'syntaxes/org.tmLanguage.json',
  'syntaxes/org.language-configuration.json',
];

const FATAL_LOG_PATTERNS = [
  /Cannot find module/i,
  /Failed to initialize Tree-sitter/i,
  /MODULE_NOT_FOUND/,
  /ERR_INVALID_ARG_VALUE/,
];

function frame(obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  return Buffer.concat([
    Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'ascii'),
    body,
  ]);
}

function checkRequiredFiles() {
  const missing = REQUIRED_FILES.filter(
    (rel) => !fs.existsSync(path.join(repoRoot, rel)),
  );
  if (missing.length > 0) {
    throw new Error(
      `Packaged output is missing required file(s):\n  - ${missing.join('\n  - ')}\n` +
        'Run `pnpm run build` before `pnpm run test:package`.',
    );
  }
}

/**
 * Runs the bundled language server from an isolated directory and resolves once
 * it has answered `initialize` and reported a successful Tree-sitter init.
 */
function runServerSmokeTest() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orgdown-package-'));
  const isolatedDist = path.join(tmpDir, 'server', 'dist');
  fs.mkdirSync(path.dirname(isolatedDist), { recursive: true });
  fs.cpSync(path.join(repoRoot, 'server', 'dist'), isolatedDist, {
    recursive: true,
  });

  const serverModule = path.join(isolatedDist, 'server.js');
  const child = spawn(process.execPath, [serverModule, '--stdio'], {
    cwd: tmpDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_PATH: '' },
  });

  return new Promise((resolve, reject) => {
    let settled = false;
    let buffer = Buffer.alloc(0);
    let gotInitializeResponse = false;
    let gotTreeSitterReady = false;
    const logs = [];

    const timer = setTimeout(() => {
      finish(
        new Error(
          `Timed out after ${INIT_TIMEOUT_MS}ms waiting for the language server.\n` +
            describeState(),
        ),
      );
    }, INIT_TIMEOUT_MS);

    function describeState() {
      return (
        `  initialize response: ${gotInitializeResponse}\n` +
        `  tree-sitter ready:   ${gotTreeSitterReady}\n` +
        `  logs:\n${logs.map((line) => `    ${line}`).join('\n') || '    (none)'}`
      );
    }

    function cleanup() {
      try {
        child.kill();
      } catch {
        /* already gone */
      }
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* best effort */
      }
    }

    function finish(error) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      cleanup();
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    }

    function recordLog(line) {
      if (!line) {
        return;
      }
      logs.push(line);
      if (FATAL_LOG_PATTERNS.some((pattern) => pattern.test(line))) {
        finish(new Error(`Language server reported a fatal error:\n${describeState()}`));
        return;
      }
      if (/Tree-sitter initialized successfully/i.test(line)) {
        gotTreeSitterReady = true;
        if (gotInitializeResponse) {
          finish();
        }
      }
    }

    function handleMessage(message) {
      if (message.id === 1 && message.result) {
        gotInitializeResponse = true;
      }
      if (message.method === 'window/logMessage' && message.params) {
        recordLog(message.params.message);
      }
      if (message.method === 'window/showMessage' && message.params) {
        recordLog(message.params.message);
      }
      if (gotInitializeResponse && gotTreeSitterReady) {
        finish();
      }
    }

    function onStdout(chunk) {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        const separator = buffer.indexOf('\r\n\r\n');
        if (separator < 0) {
          return;
        }
        const header = buffer.slice(0, separator).toString('ascii');
        const match = /Content-Length: (\d+)/i.exec(header);
        if (!match) {
          buffer = buffer.slice(separator + 4);
          continue;
        }
        const length = Number.parseInt(match[1], 10);
        if (buffer.length < separator + 4 + length) {
          return;
        }
        const body = buffer.slice(separator + 4, separator + 4 + length).toString('utf8');
        buffer = buffer.slice(separator + 4 + length);
        try {
          handleMessage(JSON.parse(body));
        } catch {
          recordLog(`[unparseable message] ${body}`);
        }
      }
    }

    child.stdout.on('data', onStdout);
    child.stderr.on('data', (chunk) => recordLog(`[stderr] ${chunk.toString().trim()}`));
    child.on('error', (error) => finish(new Error(`Failed to spawn language server: ${error.message}`)));
    child.on('exit', (code, signal) => {
      if (!settled) {
        finish(
          new Error(
            `Language server exited before initialization completed (code=${code}, signal=${signal}).\n` +
              describeState(),
          ),
        );
      }
    });

    child.stdin.write(
      frame({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { processId: null, rootUri: null, capabilities: {} },
      }),
    );
  });
}

async function main() {
  checkRequiredFiles();
  await runServerSmokeTest();
  console.log('✔ Packaged language server initializes Tree-sitter with no node_modules present.');
}

main().catch((error) => {
  console.error(`✘ Package verification failed:\n${error.message}`);
  process.exit(1);
});
