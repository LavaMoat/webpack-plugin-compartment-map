#!/bin/bash
set -euxo pipefail

yarn --frozen-lockfile
webpack >& /dev/null
node ../../compare-archive.js
node ../../after-build.js
