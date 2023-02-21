#!/bin/bash
set -euxo pipefail

yarn --frozen-lockfile
webpack
node ../../compare-archive.js
node ../../after-build.js
