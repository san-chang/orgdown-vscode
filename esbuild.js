const esbuild = require("esbuild");
const fs = require('fs-extra');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const wasmCopyPlugin = {
	name: 'wasm-copy',
	setup(build) {
		build.onEnd(async () => {
			// Copy tree-sitter-org.wasm (the grammar)
			const srcOrg = path.join(__dirname, 'server', 'assets', 'tree-sitter-org.wasm');
			const destOrg = path.join(__dirname, 'server', 'dist', 'tree-sitter-org.wasm');
			if (await fs.pathExists(srcOrg)) {
				await fs.copy(srcOrg, destOrg);
				console.log('[wasm-copy] Copied tree-sitter-org.wasm to server/dist');
			} else {
				console.warn('[wasm-copy] Warning: tree-sitter-org.wasm not found in server/assets. Skipping copy.');
			}

			// Copy tree-sitter.wasm (the runtime)
			const srcRuntime = path.join(__dirname, 'node_modules', 'web-tree-sitter', 'tree-sitter.wasm');
			// If using pnpm, the path might be different due to symlinks, but require.resolve might help.
			// However, esbuild runs in root, so node_modules/web-tree-sitter should be accessible if hoisted or via server/node_modules.
			// Let's try to resolve it.
			let runtimePath;
			try {
				runtimePath = require.resolve('web-tree-sitter/tree-sitter.wasm');
			} catch (e) {
				// Fallback for pnpm structure if not hoisted
				runtimePath = path.join(__dirname, 'server', 'node_modules', 'web-tree-sitter', 'tree-sitter.wasm');
			}

			const destRuntime = path.join(__dirname, 'server', 'dist', 'tree-sitter.wasm');
			if (await fs.pathExists(runtimePath)) {
				await fs.copy(runtimePath, destRuntime);
				console.log('[wasm-copy] Copied tree-sitter.wasm to server/dist');
			} else {
				console.warn(`[wasm-copy] Warning: tree-sitter.wasm not found at ${runtimePath}.`);
			}
		});
	},
};

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

async function main() {
	const clientCtx = await esbuild.context({
		entryPoints: [
			'client/src/extension.ts'
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'client/dist/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	});

	const serverCtx = await esbuild.context({
		entryPoints: ['server/src/server.ts'],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'server/dist/server.js',
		// Do not externalize vscode-languageserver packages; bundle them so the
		// packaged extension doesn't rely on separate node_modules being present
		// inside the VSIX. But we MUST externalize Node.js built-in modules.
		// ALSO externalize web-tree-sitter to preserve its dynamic imports.
		external: ['fs', 'path', 'fs/promises', 'url', 'module', 'web-tree-sitter'],
		logLevel: 'silent',
		plugins: [
			esbuildProblemMatcherPlugin,
			wasmCopyPlugin
		],
	});

	if (watch) {
		await Promise.all([
			clientCtx.watch(),
			serverCtx.watch()
		]);
	} else {
		await Promise.all([
			clientCtx.rebuild(),
			serverCtx.rebuild()
		]);
		await Promise.all([
			clientCtx.dispose(),
			serverCtx.dispose()
		]);
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
