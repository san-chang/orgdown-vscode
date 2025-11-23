import * as path from 'path';
import * as fs from 'fs-extra';
import { execSync } from 'child_process';

const repoRoot = path.resolve(__dirname, '..');
const treeSitterOrgDir = path.join(repoRoot, 'vendor', 'tree-sitter-org');
const serverAssetsDir = path.join(repoRoot, 'server', 'assets');
const wasmFilename = 'tree-sitter-org.wasm';
const outputWasmPath = path.join(serverAssetsDir, wasmFilename);

async function buildWasm() {
    console.log('Building tree-sitter-org.wasm...');

    // Ensure server/assets exists
    await fs.ensureDir(serverAssetsDir);

    // Check if tree-sitter-cli is available
    try {
        execSync('pnpm exec tree-sitter --version', { stdio: 'ignore' });
    } catch {
        console.error('Error: tree-sitter-cli is not available. Please run "pnpm install".');
        process.exit(1);
    }

        // Build WASM
    // We run this inside the vendor/tree-sitter-org directory
    // The output will be tree-sitter-org.wasm in that directory
    try {
        console.log(`Running "tree-sitter build --wasm" in ${treeSitterOrgDir}...`);

        // Create a temporary tree-sitter.json if it doesn't exist
        // This is required by newer versions of tree-sitter-cli
        const configPath = path.join(treeSitterOrgDir, 'tree-sitter.json');
        let createdConfig = false;

        if (!await fs.pathExists(configPath)) {
            console.log('Creating temporary tree-sitter.json...');
            const packageJsonPath = path.join(treeSitterOrgDir, 'package.json');
            if (await fs.pathExists(packageJsonPath)) {
                const pkg = await fs.readJson(packageJsonPath);
                if (pkg['tree-sitter']) {
                    const config = {
                        grammars: pkg['tree-sitter'].map((g: any) => ({
                            name: "org",
                            scope: g.scope,
                            path: '.',
                            "file-types": ["org"],
                            "injection-regex": g["injection-regex"]
                        })),
                        metadata: {
                            version: pkg.version || "0.0.1",
                            license: pkg.license || "MIT",
                            description: pkg.description || "Org grammar",
                            authors: pkg.author ? [{ name: typeof pkg.author === 'string' ? pkg.author : pkg.author.name }] : [],
                            links: {
                                repository: pkg.repository || ""
                            }
                        }
                    };
                    await fs.writeJson(configPath, config, { spaces: 2 });
                    createdConfig = true;
                }
            }
        }

        // Note: This requires Docker or Emscripten to be installed and available
        // Try running directly first (global), then fallback to pnpm exec
        try {
             execSync('tree-sitter build --wasm', {
                cwd: treeSitterOrgDir,
                stdio: 'inherit'
            });
        } catch {
             execSync('pnpm exec tree-sitter build --wasm', {
                cwd: treeSitterOrgDir,
                stdio: 'inherit'
            });
        }

        // Clean up temporary config
        if (createdConfig) {
            await fs.remove(configPath);
        }

    } catch {
        console.error('Failed to build WASM. Ensure you have Docker or Emscripten installed.');
        process.exit(1);
    }

    // Move the generated WASM file to server/assets
    const generatedWasm = path.join(treeSitterOrgDir, wasmFilename);
    if (await fs.pathExists(generatedWasm)) {
        await fs.move(generatedWasm, outputWasmPath, { overwrite: true });
        console.log(`Successfully moved ${wasmFilename} to ${outputWasmPath}`);
    } else {
        console.error(`Error: Expected output file ${generatedWasm} not found.`);
        process.exit(1);
    }
}

buildWasm().catch(err => {
    console.error(err);
    process.exit(1);
});
