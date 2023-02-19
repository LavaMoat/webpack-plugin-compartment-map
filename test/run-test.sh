#!/bin/bash
set -euxo pipefail

webpack
node ./compare-compartment-map.js
node ./after-build.js