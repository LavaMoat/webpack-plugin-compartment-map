import spawn from 'child_process';
import fs from 'fs';
import path from 'path';
import url from 'url';

import test from 'ava';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

for (const dir of fs.readdirSync(fixturesDir)) {
  if (!fs.existsSync(path.join(fixturesDir, dir, 'package.json'))) {
    continue;
  }
  test(dir, t => {
    const output = spawn.spawnSync(path.join(__dirname, 'run-test.sh'), [], {
      cwd: path.join(fixturesDir, dir),
    });
    t.snapshot(output.stderr.toString());
    t.snapshot(output.status);
    t.snapshot(output.stdout.toString());
  })
}

test('minified is smaller than non-minified', t => {
  const [unminSize, minSize] = ([
    'app-mjs', 'app-mjs-minified'
  ]).map(f => fs.statSync(path.join(fixturesDir, f, 'dist/app.agar')).size);
  t.assert(minSize < unminSize, `app-mjs-minified ${minSize}b not smaller than app-mjs ${unminSize}b`);
});
