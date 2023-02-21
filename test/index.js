import fs from 'fs';
import url from 'url';
import test from 'ava';
import spawn from 'child_process';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = `${__dirname}fixtures/`;

for (const dir of fs.readdirSync(fixturesDir)) {
  test(`${dir}`, async t => {
    const output = spawn.spawnSync(`${process.cwd()}/run-test.sh`, [], {
      cwd: `${fixturesDir}${dir}`,
    });
    t.snapshot(output.status);
    t.snapshot(output.stdout.toString());
    t.snapshot(output.stderr.toString());
  })
}