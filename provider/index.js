"use strict";

/**
 * This file initializes the provider and tears up the system.
 */
const Provider = require("oidc-provider");

const settings = require("./configurator.js");
const setupFrontEnd = require("./helper/frontend.js");
// let provider;

settings
    .findConfiguration()
    .then(() => settings.loadMappings())
    .then(() => settings.loadKeyStores())
    .then(() => new Provider(settings.issuerUrl, settings.config))
    .then((provider) => provider.initialize(settings.keyStores))
    .then((provider) => setupFrontEnd(provider, settings))
    .then((provider) => provider.app.listen(settings.config.port))
    .catch((err) => {
        console.error(err); // eslint-disable-line no-console
        process.exit(1);
    });
