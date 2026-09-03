'use strict';

// Separate entrypoint for the no-vendor transformation. This module has no
// production adapter dependency and accepts no injectable vendor callable.
const { resealCheckpoint } = require('./reseal');

function resealNoVendor(input = {}) {
  if (Object.prototype.hasOwnProperty.call(input, 'vendorAdapters')) throw new Error('no-vendor reseal does not accept adapter injection');
  return resealCheckpoint(input);
}

module.exports = { resealNoVendor };
