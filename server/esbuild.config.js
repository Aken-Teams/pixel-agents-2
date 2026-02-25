import * as esbuild from 'esbuild';

await esbuild.build({
	entryPoints: ['src/index.ts'],
	bundle: true,
	platform: 'node',
	target: 'node18',
	format: 'esm',
	outfile: '../dist/server.js',
	external: ['pngjs', 'chokidar', 'express', 'ws'],
	banner: {
		js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`,
	},
});

console.log('Server build complete: dist/server.js');
