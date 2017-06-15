"use strict";

// const _ = require("lodash");
const fs = require("./helper/asyncfs");
const path = require("path");
const Account = require("./account.js");
const jose = require("node-jose");

// The configuration integrates the official default settings with the
// local settings. This allows administrators for focus on the key aspects
// and otherwise stick with the defaults.

const AdapterFactory = require("./adapters/factory.js");
const KeyLoader = require("./helper/keyloader.js");
const LoggingFactory = require("./helper/logging.js");

// the defaults are the unaltered settings as provided by oidc-provider.
const def = require("./settings.js");

const findConnection = require("./adapters/ldapmanager.js");

// enforce cookies over HTTPS, however, Koa-Cookie is broken for proxies
// _.set(settings, "cookies.short.secure", true);
// _.set(settings, "cookies.long.secure", true);

let instanceConfig;

class Configurator {
    constructor() {
        // find out where and how these keys are used
        this.keys = ["some secret key", "and also the old one"];

        // create certificate stubs
        this.certificates = {keys: []};
        this.integrityKeys = {keys: []};
    }

    async findConfiguration(extraPaths = [], force = false) {
        // search path priority:
        // 1. extraPaths
        // 2. OIDC_CONFIG
        // 3. /etc/oidc
        // 4. {code directory}/configuration

        let searchPath = [
            path.join(path.dirname(__dirname), "configuration")
        ];

        if (process.platform !== "win32") {
            searchPath.unshift("/etc/oidc");
        }

        // allow installations to extend the search path
        const envPath = process.env.OIDC_CONFIG;

        if (envPath && envPath.trim().length) {
            searchPath = envPath.trim().split(path.delimiter).concat(searchPath);
        }

        if (extraPaths && extraPaths.length) {
            if (typeof extraPaths === "string") {
                extraPaths = extraPaths.trim().split(path.delimiter);
            }
            if (Array.isArray(extraPaths)) {
                if (force) {
                    searchPath = extraPaths;
                }
                else {
                    searchPath = extraPaths.concat(searchPath);
                }
            }
        }

        this.cfgFilename = "settings.json";
        // allow installations to overwrite the default filename
        const envFN = process.env.OIDC_CONFIG_FILENAME;

        if (envFN && envFN.trim().length) {
            this.cfgFilename = envFN.trim();
        }

        const validPaths = await Promise.all(
            searchPath.map(
                (path) => this.checkConfigurationDir(path)
            )
        );

        const filename = validPaths.find((path) => path !== false);

        if (!filename) {
            throw "Cannot find OIDC configuration file";
        }

        return this.loadConfiguration(filename);
    }

    async checkConfigurationDir(filename) {
        filename = path.join(filename.trim(), this.cfgFilename);

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

    async loadConfiguration(cfgFile) {
        const cfg = await fs.readFile(cfgFile);

        this.referencePath = path.dirname(cfgFile);
        return this.reduceConfiguration(JSON.parse(cfg.toString()));
    }

    reduceConfiguration(config) {
        const settings = {};

        Object.keys(def.config)
            .map((k) => {
                settings[k] = config.config[k] ? config.config[k] : def.config[k];
                if (config.config[`${k}Extras`]) {
                    Object
                        .keys(config.config[`${k}Extras`])
                        .map((ek) => settings[k][ek] = config.config[`${k}Extras`][ek]);
                }
            });

        var confirmUrl = config.urls.interaction;

        settings.interactionUrl = function (ia) { // eslint-disable-line no-unused-vars
            return `${confirmUrl}${this.oidc.uuid}`;
        };

        config.log = LoggingFactory(config);

        if (config.urls.homepage) {
            settings.discovery.service_documentation = config.urls.homepage;
        }

        settings.findById = (id) => this.accountById(id);
        instanceConfig = config;
        instanceConfig.mapping = {};

        this.adapter = AdapterFactory(instanceConfig);

        return this.settings = settings;
    }

    async accountById(userid) {
        const userAdapter = this.adapter("Account");
        const userData = await userAdapter.find(userid);

        if (userData) {
            return new Account(userData, userid);
        }
        return null;
    }

    async accountByLogin(login, pwd) {
        const ldap = findConnection(instanceConfig)(this.accountInfo.source);

        const accountField = this.accountInfo.bind || this.accountInfo.id;
        let accountFilter = ["&", [`objectClass=${this.accountInfo.class}`], [`${accountField}=${login}`]];

        if (this.accountInfo.filter) {
            accountFilter = accountFilter.concat(this.accountInfo.filter);
        }

        const accountScope = this.accountInfo.scope || "sub";
        const connection = await ldap.findAndBind(accountFilter, pwd, accountScope);

        if (!connection) {
            return null;
        }

        const uInfo = await connection.findBase();

        if (!(uInfo && uInfo.length)) {
            return null;
        }

        return this.accountById(uInfo[this.accountInfo.id]);
    }

    getAcr() {
        let retval = this.config.acrValues.find((v) => v.indexOf("urn:") === 0);

        return retval >= 0 ? this.config.acrValues[retval] : null;
    }

    loadMappings() {
        instanceConfig.mapping = {};

        return Promise.all(Object.keys(instanceConfig.ldap.organization).map(
            (k) => this.loadMappingFile(k)
        ));
    }

    async loadMappingFile(name) {
        if (!(name && name.length)) {
            return null;
        }

        let mapFile = instanceConfig.ldap.organization[name];

        if (!(mapFile && mapFile.length)) {
            return null;
        }

        if (!path.isAbsolute(mapFile)) {
            mapFile = path.join(this.referencePath, mapFile);
        }

        name = name.toLowerCase();

        // throw errors on non existing or corrupted files
        const data = await fs.readFile(mapFile);
        const result = JSON.parse(data.toString("utf8"));

        instanceConfig.mapping[name] = result;
        return result;
    }

    async loadKeyStores() {
        // return promise when keystores are loaded.
        await Promise.all([
            this.loadKeyStore(instanceConfig.certificates.external).then((ks) => this.mergeStore(ks, "certificates")),
            this.loadKeyStore(instanceConfig.certificates.internal).then((ks) => this.mergeStore(ks, "integrityKeys"))
        ]);

        return this.keyStores;
    }

    async loadKeyStore(cfg) {
        const kl = new KeyLoader();
        let tPath = cfg.path;

        if (cfg.source === "folder") {
            if (!path.isAbsolute(tPath)) {
                tPath = path.join(this.referencePath, tPath);
            }
            await kl.loadKeyDir(tPath);
        }
        else if (cfg.source === "file") {
            if (!path.isAbsolute(tPath)) {
                tPath = path.join(this.referencePath, tPath);
            }
            await kl.loadKey(tPath);
        }
        return kl.keys;
    }

    async mergeStore(keystore, type) {
        const jwks = await jose.JWK.asKeyStore(this[type]);

        await Promise.all(keystore.keys.map((k) => jwks.add(k)));

        this[type] = jwks.toJSON(true);
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
        return instanceConfig.urls.issuer;
    }

    get accountInfo() {
        return instanceConfig.ldap.organization.Account;
    }
}

module.exports = new Configurator();
