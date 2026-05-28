import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const txt = readFileSync(join(root, 'accident_data.txt'), 'utf8').replace(/\r/g, '');
const centers = JSON.parse(readFileSync(join(root, 'src/data/accidentCenters.json'), 'utf8'));

const blocks = txt.trim().split(/\n\n+/).filter(b => b.trim());

const spots = blocks.map((block, i) => {
  const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
  const m = lines[0].match(/【(.+)】/);
  if (!m) throw new Error(`Invalid block at index ${i}: ${lines[0]}`);

  const parts = m[1].split(' ');
  const date = parts[0] + ' ' + parts[1];
  const type = parts[2];
  const location = parts[3];
  const parties = lines.slice(1);
  const id = 'acc' + (i + 1);
  const center = centers[id];
  if (!center) throw new Error(`No center found for ${id}`);

  return { id, date, location, type, parties, center };
});

const code = `export const ACCIDENT_SPOTS = ${JSON.stringify(spots, null, 2)
  .replace(/"(\w+)":/g, '$1:')
  .replace(/center: \[([^\]]+)\]/, (_, c) => `center: [${c}]`)
};\n`;

writeFileSync(join(root, 'src/data/accidentData.js'), code, 'utf8');
console.log(`Generated accidentData.js with ${spots.length} entries.`);
