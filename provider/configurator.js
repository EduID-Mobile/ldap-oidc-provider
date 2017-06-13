"use strict";

// const _ = require("lodash");
const fs = require("./helper/asyncfs");
const path = require("path");
const Account = require("./account.js");

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

    async loadConfiguration(cfgFile) {
        const parentDir = path.dirname(__dirname);

        if (!path.isAbsolute(cfgFile)) {
            cfgFile = path.join(parentDir, "configuration", cfgFile);
        }

        const cfg = await fs.readFile(cfgFile);

        return this.reduceConfiguration(JSON.parse(cfg.toString()));
    }

    reduceConfiguration(config) {
        const settings = {};

        Object.keys(def.config)
            .map(k => {
                settings[k] = config.config[k] ? config.config[k] : def.config[k];
                if (config.config[`${k}Extras`]) {
                    Object
                        .keys(config.config[`${k}Extras`])
                        .map(ek => settings[k][ek] = config.config[`${k}Extras`][ek]);
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

        settings.findById = id => this.accountById(id);
        this.adapter = AdapterFactory(config);

        instanceConfig = config;
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
        const connection = await ldap.findAndBind(accountFilter, pwd, scope);

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
        let retval = settings.acrValues.find(v => v.indexOf("urn:") === 0);

        return retval >= 0 ? settings.acrValues[retval] : null;
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

        const parentDir = path.dirname(__dirname);

        if (!path.isAbsolute(mapFile)) {
            mapFile = path.join(parentDir, "configuration", mapFile);
        }

        name = name.toLowerCase();

        // throw errors on non existing or corrupted files
        const data = await fs.readFile(mapFile);

        const result = JSON.parse(data.toString());

        cfg.mapping[name] = result;
        return result;
    }

    async loadKeyStores() {
        // return promise when keystores are loaded.
        await Promise.all([
            this.loadKeyStore(instanceConfig.certificates.external).then(ks => this.certificates = ks),
            this.loadKeyStore(instanceConfig.certificates.internal).then(ks => this.integrityKeys = ks)
        ]);

        return this.keyStores;
    }

    loadKeyStore(cfg) {
        let kl = new KeyLoader();

        if (cfg.source === "folder") {
            return kl
                .loadKeyDir(cfg.path)
                .then(() => kl.keys);
        }
        else if (cfg.source === "file") {
            return kl
                .loadKey(cfg.path)
                .then(() => kl.keys);
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
        return instanceConfig.urls.issuer;
    }

    get accountInfo() {
        return instanceConfig.ldap.organization.Account;
    }
}

module.exports = new Configurator();
