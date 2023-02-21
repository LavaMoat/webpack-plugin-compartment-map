import 'ses';
import fs from 'fs';
import { cwd } from 'process';
import path from 'path';
import url from 'url';
import { ZipReader } from '@endo/zip';
import { makeArchive } from '@endo/compartment-mapper';
import { makeReadPowers } from '@endo/compartment-mapper/node-powers.js';
import { default as jsonpatch } from 'fast-json-patch';

lockdown()

const textDecoder = new TextDecoder();

main().catch(err => {
  console.error(err);
  debugger
  process.exit(1);
})

async function main () {
  const pwd = cwd()+'/';
  const appEntryPath = url.pathToFileURL(path.join(pwd, 'entry.js')).toString();
  const appArchivePath = path.join(pwd, 'dist/app.agar');
  const endoArchivePath = path.join(pwd, 'dist/endo-archive.agar');
  const readPowers = makeReadPowers({ fs, url });
  const endoArchiveBytes = await makeArchive(
    readPowers,
    appEntryPath,
    {},
  );
  const endoArchiveReader = new ZipReader(endoArchiveBytes);
  await fs.promises.writeFile(endoArchivePath, endoArchiveBytes);
  const appArchiveBytes = await fs.promises.readFile(appArchivePath)
  const appArchiveReader = new ZipReader(appArchiveBytes);
  const endoSources = {}
  const appSources = {}
  for (const [fileId, { name, content }] of endoArchiveReader.files.entries()) {
    const moduleEntry = { name, content: JSON.parse(textDecoder.decode(content)) }
    endoSources[fileId] = moduleEntry
  }
  for (const [fileId, { name, content }] of appArchiveReader.files.entries()) {
    const moduleEntry = { name, content: JSON.parse(textDecoder.decode(content)) }
    appSources[fileId] = moduleEntry
  }
  // log app sources
  console.log(JSON.stringify(appSources, null, 2))
  // we diff from webpack to endo, so the patch reads like a todo list ("remove this, add this")
  const diff = jsonpatch.compare(appSources, endoSources);
  for (const entry of diff) {
    console.log(entry)
  }
}
