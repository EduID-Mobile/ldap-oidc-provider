"use strict";

/**
 * This file initializes the provider and tears up the system.
 */
const Provider = require("oidc-provider");

const settings = require("./configurator.js");
const setupFrontEnd = require("./helper/frontend.js");
const param = require("./helper/optionparser.js");
// let provider;

param.options({
    "config:": ["-c", "--configdir"]
});
param.parse(process.argv);

settings
    .findConfiguration(param.opts.config)
    .then(() => settings.loadMappings())
    .then(() => settings.loadKeyStores())
    .then(() => new Provider(settings.issuerUrl, settings.config)),
    .then((provider) => settings.registerGrantTypes(provider))
    .then((provider) => provider.initialize(settings.keyStores))
    .then((provider) => setupFrontEnd(provider, settings))
    .then((provider) => provider.app.listen(settings.config.port))
    .catch((err) => {
        console.error(err); // eslint-disable-line no-console
        process.exit(1);
    });
