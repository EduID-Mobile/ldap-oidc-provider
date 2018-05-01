"use strict";

const Debug = require("debug");
const debug = Debug("ldap-oidc:configurator");
const assert = require("assert");

// const _ = require("lodash");
const fs = require("./helper/asyncfs");
const path = require("path");
const Account = require("./account.js");

// The configuration integrates the official default settings with the
// local settings. This allows administrators for focus on the key aspects
// and otherwise stick with the defaults.
const AdapterFactory = require("./adapters/factory.js");

// const findConnection = require("./adapters/ldapmanager.js");

// load the provider
const Provider = require("oidc-provider");
const JWTAssertion  = require("oauth-jwt-assertion");

// load the frontend
const setupFrontEnd = require("./helper/frontend.js");

// the defaults are the unaltered settings as provided by oidc-provider.
const defaultSettings = require("../configuration/settings.js");

// The following options are complex and might be sourced into separate files
const ExtOptions = [
    "integrity-keys",
    "certificates",
    "connections",
    "adapters",
    "pairwiseSalt"
];

// The following options have complex default values, that should reuse default
// options unless they are explicitly set by the configuration
const ObjOptions = [
    "cookies",
    "discovery",
    "claims",
    "features",
];

async function loadConfiguration(configPath) {
    // is path file or dir?
    if (typeof configPath === "string") {
        const stat = await fs.stat(configPath);

        if (stat.isFile()) {
            return loadCfgFile(configPath);
        }
        else if (stat.isDirectory()) {
            return loadCfgDirectory(configPath);
        }
        // return {};
    }
    return configPath;
}

async function loadCfgDirectory(configPath) {
    const files = await fs.readdir(configPath);

    let config = {};

    for (var i = 0; i < files.length; i++) {
        let stat = await fs.stat(path.join(configPath, files[i]));

        if (stat.isFile()) {
            let tCfg = loadCfgFile(configPath);

            if (typeof tCfg === "object") {
                config = Object.assign(config, tCfg);
            }
        }
    }
    return config;
}

async function loadCfgFile(configFile) {
    const cfg = await fs.readFile(configFile);
    let cfgObj = {};

    if (!cfg) {
        debug(`config not loaded ${configFile}`);
        return cfgObj;
    }

    try {
        cfgObj = JSON.parse(cfg.trim());
    }
    catch (err) {
        debug("config is not json %O", err);
        debug(typeof cfg);
        return cfg;
    }

    return cfgObj;
}

class Configurator {
    constructor() {
        // create certificate stubs
        this.certificates = {keys: []};
        this.integrityKeys = {keys: []};
    }

    setupLogging() {
        if (this.settings.features.logging) {
            if (this.settings.features.devInteractions) {
                Debug.enable("develop-oidc:*,ldap-oidc:*,oidc-provider:*,jwt-assertion:*,ldap-adapter:*");
            }
            else {
                Debug.enable("ldap-oidc:*,jwt-assertion:*,ldap-adapter:*");
            }
        }
    }

    async initProvider() {
        this.provider = new Provider(this.issuerUrl, this.settings);

        this.registerGrantTypes();

        await this.provider.initialize(this.keyStores);

        setupFrontEnd(this);

        await this.provider.app.listen(this.settings.port);
    }

    async findConfiguration(extraPaths = [], force = false) {
        // search path priority:
        // 1. extraPaths
        // 2. OIDC_CONFIG
        // 3. /etc/oidc
        // 4. {code directory}/configuration

        let searchPath = [
            path.join(path.dirname(__dirname), "configuration/settings.json")
        ];

        if (process.platform !== "win32") {
            searchPath.unshift("/etc/oidc/settings.json");
            // check for docker secrets and configs
            searchPath.unshift("/settings.json");
            searchPath.unshift("/run/secrets/settings.json");
        }

        // allow installations to extend the search path
        const envPath = process.env.OIDC_CONFIG;

        if (envPath && envPath.trim().length) {
            //split mutliple paths, if provided
            searchPath = envPath.trim().split(path.delimiter).concat(searchPath);
        }

        if (extraPaths && extraPaths.length) {
            if (typeof extraPaths === "string") {
                //split mutliple paths, if provided
                extraPaths = extraPaths.trim().split(path.delimiter);
            }

            if (Array.isArray(extraPaths) && extraPaths.length) {
                if (force) {
                    searchPath = extraPaths;
                }
                else {
                    searchPath = extraPaths.concat(searchPath);
                }
            }
        }

        const validPaths = await Promise.all(
            searchPath.map(
                (path) => this.checkConfigurationDir(path)
            )
        );

        const filename = validPaths.find((path) => path !== false);

        assert(filename, "Cannot find OIDC configuration file");

        // proces the basic configuration
        const config = await loadConfiguration(filename);

        // overwrite the default values
        const settings = Object.assign(defaultSettings, config);

        // ensure that configuration is complete also reassign the deeper values.
        ObjOptions.map(
          (option) => settings[option] = Object.assign(defaultSettings[option], settings[option])
         );

        // walk the potential external configuration files.
        await Promise.all(
              ExtOptions.map(
                async option => settings[option] = await loadConfiguration(settings[option])
              )
        );

        // check if the mapping files might be also externalised
        if (typeof settings.adapters === "object") {
            await Promise.all(
                Object.keys(settings.adapters).map(
                  async (aname) => settings.adapters[aname].mapping = await loadConfiguration(settings.adapters[aname].mapping)
                )
            );
        }

        // activate logging
        this.setupLogging();

        // initialize the data sources
        this.adapter = AdapterFactory(settings.connections, settings.adapters);

        settings.interactionUrl = function (ctx, ia) { // eslint-disable-line no-unused-vars
            return `${settings.urls.interaction}${ctx.oidc.uuid}`;
        };

        if (settings.urls.homepage) {
            settings.discovery.service_documentation = settings.urls.homepage;
        }

        settings.findById = (ctx, id) => this.accountById(id);

        this.settings = settings;
    }

    async checkConfigurationDir(filename) {
        try {
            const stat = await fs.stat(filename);

            if (stat.isFile()) {
                return filename;
            }
        }
        catch(err) {
            return false;
        }

        return false;
    }

    async accountById(userid) {
        debug(`find account by id = ${userid}`);

        const userAdapter = this.adapter("Account");
        const userData = await userAdapter.find(userid);

        if (userData) {
            debug("initialize the account");
            return new Account(userData, userid);
        }

        throw new Error("account not found");
    }

    async accountByLogin(login, pwd) {
        debug("account by login %s %s", login, pwd);

        const userAdapter = this.adapter("Account");

        if (!userAdapter) {
            throw new Error("missing adapter");
        }

        debug("find user data via userAdapter");
        const userData = await userAdapter.findAndBind(login, pwd);

        debug("userData: %O", userData);
        if (userData && userData.length) {

            debug("initialize the account %s", this.accountInfo.id);

            return this.accountById(userData[0][this.accountInfo.id]);
        }

        throw new Error("Login Failed");
    }

    getAcr() {
        let retval = this.settings.acrValues.find((v) => v.indexOf("urn:") === 0);

        return retval >= 0 ? this.settings.acrValues[retval] : null;
    }

    activateAssertionTypes() {
        if (this.settings.features && this.settings.features.jwtassertion) {
            if (!("jwtProxyAuthorization" in this.settings.features) ||
                this.settings.features.jwtProxyAuthorization) {
                JWTAssertion.registerHandler(JWTAssertion.handler.authorization);
            }
            if (!("jwtProxyAuthentication" in this.settings.features) ||
                this.settings.features.jwtProxyAuthentication) {
                JWTAssertion.registerHandler(JWTAssertion.handler.authentication);
            }
        }
    }

    registerGrantTypes() {
        if (this.settings.features && this.settings.features.jwtassertion) {
            JWTAssertion.registerGrantType(this.provider, this);

            this.activateAssertionTypes();
        }
    }

    get config() {
        return this.settings;
    }

    get customization() {
        return this.settings;
    }

    get urls() {
        return this.settings.urls;
    }

    get keyStores() {
        return {
            adapter: this.adapter,
            clients: [],
            keystore: this.certificates,
            integrity: this.integrityKeys,
        };
    }

    get issuerUrl() {
        return this.settings.urls.issuer;
    }

    get accountInfo() {
        return { "id": "sub" };
    }
}

module.exports = new Configurator();
