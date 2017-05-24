"use strict";

const Account = require("./account.js");

// The configuration integrates the official default settings with the
// local settings. This allows administrators for focus on the key aspects
// and otherwise stick with the defaults.
const findConnection = require("./adapters/ldapmanager.js");
const AdapterFactory = require("./adapters/factory.js");

class Configurator {
    constructor(cfg, def) {
        this.config = {};

        this.accountInfo   = cfg.directoryOrganisation.Account;

        Object.keys(def.config)
            .map(k => {
                this.config[k] = cfg.config[k] ? cfg.config[k] : def.config[k];
                if (cfg.config[`${k}Extras`]) {
                    Object
                        .keys(cfg.config[`${k}Extras`])
                        .map(ek => this.config[k][ek] = cfg.config[`${k}Extras`][ek]);
                }
            });

        if (cfg.urls.homepage) {
            this.config.discovery.service_documentation = cfg.urls.homepage;
        }

        this.issuerUrl  = cfg.urls.issuer;
        var confirmUrl = cfg.urls.interaction;


        this.config.interactionUrl = function (ia) { // eslint-disable-line no-unused-vars
            return `${confirmUrl}${this.oidc.uuid}`;
        };

        // proxy adapter for mapping between LDAP and REDIS adapters
        this.config.adapter = AdapterFactory();

        this.config.findById = id => this.accountById(id);

        this.certificates = def.certificates;
        this.integrityKeys = def.integrityKeys;
    }

    accountById(userid) {
        let ldap = findConnection(this.accountInfo.source);

        let accountField = this.accountInfo.id || "uid";
        let accountFilter = ["&", [`objectClass=${this.accountInfo.class}`], [`${accountField}=${userid}`]];

        return ldap
            .find(accountFilter)
            .then(r => r.length ? r[0] : null)
            .then(e => new Account(e));
    }

    accountByLogin(login, pwd) {
        let ldap = findConnection(this.accSource);

        let accountField = this.accountInfo.bind || "mail";
        let accountFilter = ["&", [`objectClass=${this.accountInfo.class}`], [`${accountField}=${login}`]];

        return ldap
            .findAndBind(accountFilter, pwd)
            .then(c => c ? c.findBase() : null)
            .then(res => res && res.length ? res[0] : null)
            .then(e => new Account(e));
    }

    getAcr() {
        let retval = this.config.acrValues.find(v => v.indexOf("urn:") === 0);

        return retval >= 0 ? this.config.acrValues[retval] : null;
    }

}

module.exports = Configurator;
