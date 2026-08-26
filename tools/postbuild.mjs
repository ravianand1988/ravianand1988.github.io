import { copyFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const BROWSER_DIR = join('dist', 'ravianand1988.github.io', 'browser');

// GitHub Pages serves 404.html for unmatched paths. It must be the CSR shell,
// not index.html: index.html is the prerendered homepage and would show
// homepage content under every unknown URL.
const source = join(BROWSER_DIR, 'index.csr.html');
const target = join(BROWSER_DIR, '404.html');

await access(source);
await copyFile(source, target);
console.log(`postbuild: wrote ${target} from index.csr.html`);
