#!/bin/bash
set -euo pipefail

yarn --frozen-lockfile >& /dev/null
webpack >& /dev/null
node ../../compare-archive.js
node ../../after-build.js
