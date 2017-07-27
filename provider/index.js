"use strict";

const Debug = require("debug");
const param = require("./helper/optionparser.js");
const fs    = require("fs");

param.options({
    "config:": ["-c", "--configdir"],
    "verbose": ["-v", "--verbose"],
    "logfile:": ["-l", "--logfile"]
});

param.parse(process.argv);

if (param.opts.logfile) {
    const lf = fs.createWriteStream(param.opts.logfile);

    const c = new console.Console(lf); // eslint-disable-line no-console

    Debug.log = c.log.bind(c);
    Debug.inspectOpts.colors = false; // FIXME There MUST be a better way...
}

Debug.enable("ldap-oidc:fatal");

if (param.opts.verbose) {
    // log everything
    Debug.enable("ldap-oidc:*,oidc-provider:*");
}

const error = new Debug("ldap-oidc:fatal");
const log = new Debug("ldap-oidc:init");

error("errors are active");
log("logging is active");

/**
 * This file initializes the provider and tears up the system.
 */
const Provider = require("oidc-provider");

const settings = require("./configurator.js");
const setupFrontEnd = require("./helper/frontend.js");

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
