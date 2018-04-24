"use strict";

const Debug = require("debug");
const debug = Debug("ldap-oidc:Configurator");
const assert = require("assert");

// const _ = require("lodash");
const fs = require("./helper/asyncfs");
const path = require("path");
const Account = require("./account.js");

// The configuration integrates the official default settings with the
// local settings. This allows administrators for focus on the key aspects
// and otherwise stick with the defaults.
const AdapterFactory = require("./adapters/factory2.js");

// const findConnection = require("./adapters/ldapmanager.js");

// load the provider
const Provider = require("oidc-provider");
const JWTAssertion  = require("oauth-jwt-assertion");

// load the frontend
const setupFrontEnd = require("./helper/frontend.js");

// the defaults are the unaltered settings as provided by oidc-provider.
const defaultSettings = require("./settings.js");

let instanceConfig;

async function loadConfiguration(configPath) {
    // is path file or dir?
    const stat = await fs.stat(configPath);

    if (stat.isFile()) {
        return loadCfgFile(configPath);
    }
    else if (stat.isDirectory()) {
        return loadCfgDirectory(configPath);
    }
    return {};
}

async function loadCfgDirectory(configPath) {
    const files = await fs.readdir(configPath);

    let config = {};

    for (var i = 0; i < files.length; i++) {
        let stat = await fs.stat(path.join(configPath, files[i]));

        if (stat.isFile()) {
            let tCfg = loadCfgFile(configPath);

            config = Object.assign(tCfg, config);
        }
    }
    return config;
}

async function loadCfgFile(configFile) {
    const cfg = await fs.readFile(configFile);

    return JSON.parse(cfg.trim());
}

class Configurator {
    constructor() {
        // create certificate stubs
        this.certificates = {keys: []};
        this.integrityKeys = {keys: []};
    }

    setupLogging() {
        if (this.settings.logging) {
            if (this.settings.logging === "debug") {
                Debug.enable("debug:ldap-oidc:*,ldap-oidc:*,oidc-provider:*");
            }
            else {
                Debug.enable("ldap-oidc:*,oidc-provider:*");
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

        const config = await loadConfiguration(filename);
        const settings = Object.assign(defaultSettings, config);

        // walk the potential configuration files.

        // check keys
        const keystores = ["integrity-keys", "certificates"];

        if (typeof settings[keystores[1]] === "string") {
            this.certificates = await loadConfiguration(settings[keystores[1]]);
        }
        else {
            this.certificates = settings[keystores[1]];
        }

        if (typeof settings[keystores[0]] === "string") {
            this.integrityKeys = await loadConfiguration(settings[keystores[0]]);
        }
        else {
            this.integrityKeys = settings[keystores[0]];
        }

        if (typeof settings.connections === "string") {
            settings.connections = await loadConfiguration(settings.connections);
        }

        if (typeof settings.adapters === "string") {
            settings.adapters = await loadConfiguration(settings.adapters);
        }

        if (typeof settings.adapters === "object") {
            for (let aname in settings.adapters) {
                if (typeof settings.adapters[aname].mapping === "string") {
                    settings.adapters[aname].mapping = await loadConfiguration(settings.adapters[aname].mapping);
                }
            }
        }

        if (typeof settings.pairwiseSalt === "string") {
            const psStat = await fs.stat(settings.pairwiseSalt);

            if (psStat.isFile()) {
                settings.pairwiseSalt = await fs.readFile(settings.pairwiseSalt);
                settings.pairwiseSalt = settings.pairwiseSalt.trim();
            }
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

    registerGrantTypes() {
        if (this.settings.features && this.settings.features.jwtassertion) {
            JWTAssertion.registerGrantType(this.provider, this);
        }
    }

    get config() {
        return this.settings;
    }

    get customization() {
        return instanceConfig;
    }

    get urls() {
        return instanceConfig.urls;
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
