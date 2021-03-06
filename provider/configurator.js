"use strict";

const debug = require("debug")("ldap-oidc:settings");
const assert = require("assert");

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
// const findConnection = require("./adapters/ldapmanager.js");
const grantTypeFactory = require("./actions");

const compose = require("koa-compose");

// load the provider
const Provider = require("oidc-provider");

// load the frontend
const setupFrontEnd = require("./helper/frontend.js");

// the defaults are the unaltered settings as provided by oidc-provider.
const def = require("./settings.js");
const assertionClaimHandler = {};

let instanceConfig;

class Configurator {
    constructor() {
        // find out where and how these keys are used
        this.keys = ["some secret key", "and also the old one"];

        // create certificate stubs
        this.certificates = {keys: []};
        this.integrityKeys = {keys: []};
    }

    async initProvider() {
        await this.loadMappings();
        await this.loadKeyStores();

        this.provider = new Provider(this.issuerUrl, this.config);
        this.registerGrantTypes();

        await this.provider.initialize(this.keyStores);

        setupFrontEnd(this);

        await this.provider.app.listen(this.config.port);
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
            //split mutliple paths, if provided
            searchPath = envPath.trim().split(path.delimiter).concat(searchPath);
        }

        if (extraPaths && extraPaths.length) {
            if (typeof extraPaths === "string") {
                //split mutliple paths, if provided
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

        assert(filename, "Cannot find OIDC configuration file");

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

    setConfiguration(config, refPath = "") {
        if (typeof config === "string") {
            config = JSON.parse(config);
        }

        this.referencePath = refPath || "";
        return this.reduceConfiguration(config);
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

        settings.interactionUrl = function (ctx, ia) { // eslint-disable-line no-unused-vars
            return `${confirmUrl}${ctx.oidc.uuid}`;
        };

        config.log = LoggingFactory(config);

        if (config.urls.homepage) {
            settings.discovery.service_documentation = config.urls.homepage;
        }

        settings.findById = (ctx, id) => this.accountById(id);
        instanceConfig = config;
        instanceConfig.mapping = {};

        this.adapter = AdapterFactory(instanceConfig);

        return this.settings = settings;
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
        let retval = this.config.acrValues.find((v) => v.indexOf("urn:") === 0);

        return retval >= 0 ? this.config.acrValues[retval] : null;
    }

    async loadMappings() {
        instanceConfig.mapping = {};
        if (instanceConfig.ldap) {
            await Promise.all(Object.keys(instanceConfig.ldap.organization).map(
                (k) => this.loadMappingFile(k)
            ));
        }
    }

    async loadMappingFile(name) {
        if (!(name && name.length)) {
            return null;
        }

        let mapFile = instanceConfig.ldap.organization[name] ? instanceConfig.ldap.organization[name].mapping : null;

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
            this.loadKeyStore(instanceConfig.certificates.external)
                .then((ks) => this.mergeStore(ks, "certificates")),
            this.loadKeyStore(instanceConfig.certificates.internal)
                .then((ks) => this.mergeStore(ks, "integrityKeys"))
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

    registerGrantTypes() {
        if (typeof instanceConfig.grant_types === "object" &&
            !Array.isArray(instanceConfig.grant_types)) {

            Object.keys(instanceConfig.grant_types)
                .map((gt) => this.provider.registerGrantType(gt,
                                                             grantTypeFactory(instanceConfig.grant_types[gt].handler, this),
                                                             instanceConfig.grant_types[gt].parameter));
        }
    }

    registerAssertionValidator(assertionClaim, claimValidator) {
        assert(assertionClaim, "no assertion claim provided");
        assert(claimValidator, "no claim validator provided ");
        assert.equal(typeof claimValidator, "function", "claim handler is not a function");
        assert(assertionClaimHandler[assertionClaim], "claim handler already configured");

        assertionClaimHandler[assertionClaim] = claimValidator;
    }

    getAssertionValidators(claimset) {
        return compose(Object.keys(assertionClaimHandler).filter((claim) => claimset.includes(claim)));
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
        if (instanceConfig.ldap) {
            return instanceConfig.ldap.organization.Account;
        }
        return { "id": "sub" };
    }
}

module.exports = new Configurator();
