"use strict";
const debug = require("debug");

debug.enable("ldap-oidc:fatal");
/**
 * This file initializes the provider and tears up the system.
 */
const Provider = require("oidc-provider");

const settings = require("./configurator.js");
const setupFrontEnd = require("./helper/frontend.js");
const param = require("./helper/optionparser.js");
const fs = require("fs");
// let provider;

param.options({
    "config:": ["-c", "--configdir"],
    "verbose": ["-v", "--verbose"],
    "logfile:": ["-l", "--logfile"]
});

param.parse(process.argv);

if (param.opts.logfile) {
    const lf = fs.createWriteStream(param.opts.logfile);

    debug.log = lf.write.bind(lf);
}

const error = debug("ldap-oidc:fatal");
let log;

if (param.opts.verbose) {
    // log everything
    debug.enable("ldap-oidc:*");
    debug.enable("oidc-provider:*");

    log = debug("ldap-oidc:init");
    log("verbose is set");
}

settings
    .findConfiguration(param.opts.config)
    .then(() => settings.loadMappings())
    .then(() => settings.loadKeyStores())
    .then(() => new Provider(settings.issuerUrl, settings.config))
    .then((provider) => settings.registerGrantTypes(provider))
    .then((provider) => provider.initialize(settings.keyStores))
    .then((provider) => setupFrontEnd(provider, settings))
    .then((provider) => provider.app.listen(settings.config.port))
    .catch((err) => {
        error(err); // eslint-disable-line no-console
        process.exit(1);
    });
