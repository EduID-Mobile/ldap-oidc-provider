"use strict";

/**
 * This file initializes the provider and tears up the system.
 */
const Provider = require("oidc-provider");

const settings = require("./configurator.js");
const setupFrontEnd = require("./helper/frontend.js");
const cfgFile   = require("../configuration/settings.js");

let provider;

settings
    .loadConfiguration(cfgFile)
    .then(() => settings.loadMappings())
    .then(() => provider = new Provider(settings.issuerUrl, settings.config))
    .then(() => settings.loadKeyStores())
    .then((keyStores) => provider.initialize(keyStores))
    .then(() => setupFrontEnd(provider, settings))
    .then(() => provider.app.listen(settings.config.port))
    .catch((err) => {
        console.error(err); // eslint-disable-line no-console
        process.exit(1);
    });
