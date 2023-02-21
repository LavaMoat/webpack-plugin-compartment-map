import 'ses';
import fs from 'fs';
import { cwd } from 'process';
import path from 'path';
import url from 'url';
import { loadArchive } from '@endo/compartment-mapper';
import { makeReadPowers } from '@endo/compartment-mapper/node-powers.js';

lockdown()

main().catch(err => {
  console.error(err);
  debugger
  process.exit(1);
})

async function main () {
  const archiveFixture = url.pathToFileURL(path.join(cwd(), 'dist/app.agar')).toString();
  const readPowers = makeReadPowers({ fs, url });

  // loadArchive + archive.import are just inlined from importArchive
  const archive = await loadArchive(readPowers.read, archiveFixture, {
  });
  await archive.import({
    globals: { console },
  });
}
