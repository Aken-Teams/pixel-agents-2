/**
 * Tileset Slicer - Extracts individual furniture items from the Office Tileset PNG.
 * Reads tileset-regions.json for region definitions, outputs individual PNGs + catalog.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import { getTilesetDir, getAssetsRoot } from './config.js';
import type { FurnitureAsset } from './assetLoader.js';

export interface TilesetRegion {
	id: string;
	name: string;
	label: string;
	category: string;
	col: number;
	row: number;
	widthTiles: number;
	heightTiles: number;
	footprintW: number;
	footprintH: number;
	isDesk: boolean;
	canPlaceOnWalls?: boolean;
	orientation?: string;
	groupId?: string;
	state?: string;
	canPlaceOnSurfaces?: boolean;
	backgroundTiles?: number;
	partOfGroup?: boolean;
}

export interface TilesetConfig {
	tileSize: number;
	regions: TilesetRegion[];
}

export async function sliceTileset(): Promise<{ catalog: FurnitureAsset[]; outputDir: string } | null> {
	const assetsRoot = getAssetsRoot();
	const tilesetDir = getTilesetDir();
	const tilesetPath = path.join(tilesetDir, 'Office Tileset All 16x16 no shadow.png');
	const regionsPath = path.join(assetsRoot, 'assets', 'tileset-regions.json');
	const outputDir = path.join(assetsRoot, 'client', 'public', 'assets', 'furniture');

	if (!fs.existsSync(tilesetPath)) {
		console.log('[TilesetSlicer] Tileset PNG not found at:', tilesetPath);
		return null;
	}

	if (!fs.existsSync(regionsPath)) {
		console.log('[TilesetSlicer] tileset-regions.json not found at:', regionsPath);
		return null;
	}

	console.log('[TilesetSlicer] Loading tileset from:', tilesetPath);
	const pngBuffer = fs.readFileSync(tilesetPath);
	const tileset = PNG.sync.read(pngBuffer);

	const configContent = fs.readFileSync(regionsPath, 'utf-8');
	const config: TilesetConfig = JSON.parse(configContent);
	const tileSize = config.tileSize;

	// Ensure output directory exists
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	const catalog: FurnitureAsset[] = [];

	for (const region of config.regions) {
		const x = region.col * tileSize;
		const y = region.row * tileSize;
		const w = region.widthTiles * tileSize;
		const h = region.heightTiles * tileSize;

		// Bounds check
		if (x + w > tileset.width || y + h > tileset.height) {
			console.warn(`[TilesetSlicer] Region "${region.id}" extends beyond tileset bounds, skipping`);
			continue;
		}

		// Create individual PNG
		const itemPng = new PNG({ width: w, height: h });
		for (let row = 0; row < h; row++) {
			for (let col = 0; col < w; col++) {
				const srcIdx = ((y + row) * tileset.width + (x + col)) * 4;
				const dstIdx = (row * w + col) * 4;
				itemPng.data[dstIdx] = tileset.data[srcIdx];
				itemPng.data[dstIdx + 1] = tileset.data[srcIdx + 1];
				itemPng.data[dstIdx + 2] = tileset.data[srcIdx + 2];
				itemPng.data[dstIdx + 3] = tileset.data[srcIdx + 3];
			}
		}

		const filename = `${region.id}.png`;
		const outputPath = path.join(outputDir, filename);
		fs.writeFileSync(outputPath, PNG.sync.write(itemPng));

		catalog.push({
			id: region.id,
			name: region.name,
			label: region.label,
			category: region.category,
			file: `furniture/${filename}`,
			width: w,
			height: h,
			footprintW: region.footprintW,
			footprintH: region.footprintH,
			isDesk: region.isDesk,
			canPlaceOnWalls: region.canPlaceOnWalls || false,
			orientation: region.orientation,
			groupId: region.groupId,
			state: region.state,
			canPlaceOnSurfaces: region.canPlaceOnSurfaces,
			backgroundTiles: region.backgroundTiles,
			partOfGroup: region.partOfGroup,
		});
	}

	// Write catalog JSON
	const catalogPath = path.join(outputDir, 'furniture-catalog.json');
	fs.writeFileSync(catalogPath, JSON.stringify({ assets: catalog }, null, 2), 'utf-8');

	console.log(`[TilesetSlicer] Extracted ${catalog.length} furniture items to ${outputDir}`);
	return { catalog, outputDir };
}

// Run directly if called as a script
if (process.argv[1]?.endsWith('tilesetSlicer.ts') || process.argv[1]?.endsWith('tilesetSlicer.js')) {
	sliceTileset().then((result) => {
		if (result) {
			console.log(`Done! ${result.catalog.length} items extracted.`);
		} else {
			console.error('Failed to slice tileset.');
			process.exit(1);
		}
	});
}
