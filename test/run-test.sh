#!/bin/bash
set -euxo pipefail

webpack
node ./compare-archive.js
node ./after-build.js