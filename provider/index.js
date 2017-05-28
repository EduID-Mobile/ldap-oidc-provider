"use strict";

/**
 * This file initializes the provider and tears up the system.
 */
const Provider = require("oidc-provider");

const settings = require("./configurator.js");
const setupFrontEnd = require("./helper/frontend.js");

const provider = new Provider(settings.issuerUrl, settings.config);

settings
    .loadKeyStores()
    .then((keyStores) => provider.initialize(keyStores))
    .then(() => setupFrontEnd(provider, settings))
    .then(() => {
        settings.log("init provider with " + settings.config.port);
        provider.app.listen(settings.config.port);
    })
    .catch((err) => {
        console.error(err); // eslint-disable-line no-console
        process.exit(1);
    });
