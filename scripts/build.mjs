// Static build: bundles the 3D mask, copies /site to /dist, fills in the
// site URL, writes sitemap.xml and checks every JSON-LD block parses.
//
//   SITE_URL=https://learn.aphronabeauty.com npm run build
import { build } from 'esbuild';
import { cp, readdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SITE = join(ROOT, 'site');
const DIST = join(ROOT, 'dist');
const SITE_URL = (process.env.SITE_URL || 'https://jz6424.github.io/30x30-2026-1').replace(/\/$/, '');
const TODAY = new Date().toISOString().slice(0, 10);

await rm(DIST, { recursive: true, force: true });
await cp(SITE, DIST, { recursive: true });

await build({
  entryPoints: [join(ROOT, 'src/mask.js')],
  bundle: true, minify: true, format: 'esm', target: 'es2020',
  outfile: join(DIST, 'assets/mask.js'), legalComments: 'none',
});

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p)); else out.push(p);
  }
  return out;
}

const files = await walk(DIST);
const pages = [];
for (const f of files) {
  if (!/\.(html|txt|xml|webmanifest|json)$/.test(f)) continue;
  let s = await readFile(f, 'utf8');
  s = s.replaceAll('{{SITE_URL}}', SITE_URL).replaceAll('{{BUILD_DATE}}', TODAY);
  await writeFile(f, s);
  if (f.endsWith('.html') && !/<meta name="robots" content="noindex/.test(s)) {
    const path = '/' + relative(DIST, f).replace(/index\.html$/, '');
    pages.push(path);
    for (const m of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(m[1]); } catch (e) { throw new Error(`Bad JSON-LD in ${f}: ${e.message}`); }
    }
  }
}

pages.sort((a, b) => a.length - b.length);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE_URL}${p}</loc><lastmod>${TODAY}</lastmod><priority>${p === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n')}
</urlset>
`;
await writeFile(join(DIST, 'sitemap.xml'), sitemap);

const size = async (p) => ((await stat(join(DIST, p))).size / 1024).toFixed(1) + ' KB';
console.log(`Built ${pages.length} pages for ${SITE_URL}`);
console.log(`mask.js ${await size('assets/mask.js')}, styles.css ${await size('assets/styles.css')}`);
