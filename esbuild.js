const esbuild = require("esbuild");
const fs = require('fs-extra');
const path = require('path');
const { builtinModules } = require('module');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

function isNodeBuiltin(id) {
	return id.startsWith('node:') || builtinModules.includes(id);
}

/**
 * Fails the build if a bundle still contains a literal require() for a module
 * that is neither a Node built-in nor explicitly allowed.
 *
 * The packaged VSIX does not ship node_modules (see .vscodeignore), so such a
 * require() only blows up after packaging/installing - exactly the "works with
 * F5, broken from the marketplace" failure mode this guard prevents.
 *
 * @param {{ allowed?: string[] }} [options]
 * @returns {import('esbuild').Plugin}
 */
function verifyNoUnbundledRequiresPlugin(options = {}) {
	const allowed = options.allowed ?? [];
	return {
		name: 'verify-no-unbundled-requires',
		setup(build) {
			build.onEnd((result) => {
				if (result.errors.length > 0) {
					return;
				}
				const outfile = build.initialOptions.outfile;
				if (!outfile) {
					return;
				}
				let source;
				try {
					source = require('fs').readFileSync(outfile, 'utf8');
				} catch {
					return;
				}
				const required = new Set();
				const re = /require\(\s*["']([^"']+)["']\s*\)/g;
				let match;
				while ((match = re.exec(source)) !== null) {
					required.add(match[1]);
				}
				const unbundled = [...required].filter(
					(id) => !isNodeBuiltin(id) && !allowed.includes(id)
				);
				if (unbundled.length > 0) {
					// Throw instead of pushing to result.errors: mutating result.errors in
					// onEnd is only reported by the esbuild CLI, not by context.rebuild().
					throw new Error(
						`Unbundled external module(s) in ${path.relative(process.cwd(), outfile)}: ` +
							`${unbundled.join(', ')}. They are not shipped in the VSIX and will fail ` +
							`at runtime. Bundle them or add them to the allowed list.`,
					);
				}
			});
		},
	};
}

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
			verifyNoUnbundledRequiresPlugin({ allowed: ['vscode'] }),
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
		// inside the VSIX. Node.js built-in modules must stay external. Bundling
		// web-tree-sitter keeps the packaged extension self-contained: its
		// tree-sitter.wasm is resolved via locateFile relative to the bundle
		// (server/dist), where wasmCopyPlugin places it.
		external: ['fs', 'path', 'fs/promises', 'url', 'module'],
		// web-tree-sitter's Emscripten glue calls createRequire(import.meta.url).
		// esbuild's cjs output leaves import.meta.url empty, which makes that
		// call throw at runtime. Provide the bundle's own file URL instead.
		define: {
			'import.meta.url': '__orgdownImportMetaUrl',
		},
		banner: {
			js: "const __orgdownImportMetaUrl = require('url').pathToFileURL(__filename).href;",
		},
		logLevel: 'silent',
		plugins: [
			esbuildProblemMatcherPlugin,
			wasmCopyPlugin,
			verifyNoUnbundledRequiresPlugin(),
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
