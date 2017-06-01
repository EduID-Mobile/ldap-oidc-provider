"use strict";

// const _ = require("lodash");

const Account = require("./account.js");

// The configuration integrates the official default settings with the
// local settings. This allows administrators for focus on the key aspects
// and otherwise stick with the defaults.
const findConnection = require("./adapters/ldapmanager.js");
const AdapterFactory = require("./adapters/factory.js");
const KeyLoader = require("./helper/keyloader.js");
const LoggingFactory = require("./helper/logging.js");

// the defaults are the unaltered settings as provided by oidc-provider.
const def = require("./settings.js");

// the cfg contains the configuration for the eduid frontend of oidc-provider.
const cfg   = require("../configuration/settings.js");

const settings = {};

Object.keys(def.config)
    .map(k => {
        settings[k] = cfg.config[k] ? cfg.config[k] : def.config[k];
        if (cfg.config[`${k}Extras`]) {
            Object
                .keys(cfg.config[`${k}Extras`])
                .map(ek => settings[k][ek] = cfg.config[`${k}Extras`][ek]);
        }
    });

// enforce cookies over HTTPS, however, Koa-Cookie is broken for proxies
// _.set(settings, "cookies.short.secure", true);
// _.set(settings, "cookies.long.secure", true);

var confirmUrl = cfg.urls.interaction;

settings.interactionUrl = function (ia) { // eslint-disable-line no-unused-vars
    return `${confirmUrl}${this.oidc.uuid}`;
};

cfg.log = LoggingFactory(cfg);

if (cfg.urls.homepage) {
    settings.discovery.service_documentation = cfg.urls.homepage;
}

class Configurator {
    constructor() {
        settings.findById = id => this.accountById(id);

        // find out where and how these keys are used
        this.keys = ["some secret key", "and also the old one"];

        // create certificate stubs
        this.certificates = {keys: []};
        this.integrityKeys = {keys: []};

        this.adapter = AdapterFactory(cfg);

        // add logging core
        this.log = cfg.log;
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
        const ldap = await findConnection(this.accountInfo.source);

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

    loadKeyStores() {
        // return promise when keystores are loaded.
        return Promise.all([
            this.loadKeyStore(cfg.certificates.external).then(ks => this.certificates = ks),
            this.loadKeyStore(cfg.certificates.internal).then(ks => this.integrityKeys = ks)
        ]).then(() => this.keyStores);
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
        return settings;
    }

    get urls() {
        return cfg.urls;
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
        return cfg.urls.issuer;
    }

    get accountInfo() {
        return cfg.directoryOrganisation.Account;
    }
}

module.exports = new Configurator();
