"use strict";

/**
 * this module Pomisifies the standard File System API. It removes the special
 * handling of FS function in async functions.
 */

const promisify = require("./promisify.js");
const nodefs = require("fs");

module.exports = promisify(nodefs);
