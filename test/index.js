import spawn from 'child_process';
import fs from 'fs';
import path from 'path';
import url from 'url';

import test from 'ava';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

for (const dir of fs.readdirSync(fixturesDir)) {
  test(dir, t => {
    const output = spawn.spawnSync(path.join(__dirname, 'run-test.sh'), [], {
      cwd: path.join(fixturesDir, dir),
    });
    t.snapshot(output.status);
    t.snapshot(output.stderr.toString());
    t.snapshot(output.stdout.toString());
  })
}
