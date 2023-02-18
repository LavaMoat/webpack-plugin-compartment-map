import 'ses';
import fs from 'fs';
import url from 'url';
import { importArchive } from '@endo/compartment-mapper';
import { makeReadPowers } from '@endo/compartment-mapper/node-powers.js';

lockdown()

main()

async function main () {
  const archiveFixture = new URL('dist/app.agar', import.meta.url).toString();

  const readPowers = makeReadPowers({ fs, url });
  const { namespace } = await importArchive(readPowers.read, archiveFixture, {
    // globals,
    // modules,
    // Compartment,
  });
}

// const fixture = new URL(
//   'fixtures-0/node_modules/app/main.js',
//   import.meta.url,
// ).toString();
