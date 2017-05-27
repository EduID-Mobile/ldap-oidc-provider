"use strict";

// const pkg = require("../package.json");

/**
 * The core configuration of the EduID interface contains:
 *
 * -   The directory host URL for the ldap or ldaps protocol
 * -   The service DN.
 * -   The service password.
 *
 * The rest of the configuration comes from the directory.
 * Therefore the configuration must be stored in the sub scope of
 * the service.
 *
 * The configuration has several parts:
 * -   the core setup.
 * -   the local keys.
 * -   the relevant LDAP paths for the user store and the services.
 */

/**
 * the directory settings are used for the core LDAP connections.
 *
 * EduID OIDC is designed to work with multiple directories
 * In principle any ldap adapter could get tied to a different source.
 * In practice it is likely that clients and accounts are organised in different
 * domains.
 *
 * Technically, all Adapters from the same source share the same connection
 * to the directory. The IDP will instanciate only one connection per directory
 * found in this configuration.
 */
module.exports.directory = {
    common: {
        url: "ldap://192.168.56.102:389",
        bind: "cn=oidc,ou=configurations,dc=local,dc=dev",
        base: "dc=local,dc=dev",
        password: "oidc"
    },
    // federation: {
    //     url: "ldap://192.168.56.105:389",
    //     bind: "cn=oidc,ou=configurations,dc=local,dc=dev",
    //     base: "dc=local,dc=dev",
    //     password: "oidc"
    // }
};

/**
 * the redis settings are used for the core redis connections.
 *
 * this allows one to distribute data across different redis servers.
 * The labels for the connections should be either common (default) or the
 * adapter names.
 */
module.exports.redis = {
    common: {
        url: "redis://127.0.0.1/1",
        prefix: "oidc"
    }
};

/**
 * The directory organization informs the provider LDAP adapter about how
 * to retrieve information for the different information types.
 *
 * Every adapter type that is defined here will be linked to the directory
 * adapter. All others are linked to the redis adapter.
 *
 * Note that the source has to be set for all accounts.
 */
module.exports.directoryOrganisation = {
    "Account": {
        class: "inetOrgPerson",
        bind: "mail",
        id: "uid",
        source: "common",
    },
    "Client": {
        class: "organizationalRole",
        id: "cn",
        source: "common",
    },
    // client credentials SHOULD be the same as the Client.
    "ClientCredentials": {
        class: "organizationalRole",
        id: "cn",
        source: "common",
    }
};

// module.exports.directoryOrganisation.ClientCredentials = module.exports.directoryOrganisation.Client;

/**
 * The URLs are used for the discovery as oidc-provider does not handle them
 * via the config values.
 */
module.exports.urls = {
    issuer: "http://192.168.56.103/oidc",
    interaction: "http://192.168.56.103/oidc/interaction/",
    homepage: "https://192.168.56.103"
};

/**
 * include separate configuration options.
 *
 * claimsExtra allows adding extra scopes.
 */
module.exports.config = {
    // acrValues: ["session", "urn:mace:switch.ch:SWITCHaai:eduid.ch"],
    port: 3000,
    claimsExtra: {
        eduid: ["affiliation"]
    }
};

/**
 *
 * source: folder | file | ldap | redis
 *
 * file & folder options:
 * *   path: file system path to the keystore. For file sources path MUST point
 *     to a file; for folder sources path MUST point to a directory.
 *
 * ldap options: (NOT IMPLEMENTED YET)
 * *   url: source directory, if missing the common connection is used
 * *   base: the base DN for obtaining the certificates.
 * *   class: the object class for the certificates
 *
 * redis options: (NOT IMPLEMENTED YET)
 * *   url: redis database for the certificates, if missing redis directory is
 *     used.
 * *   key: the certificates key that is used.
 */
module.exports.certificates = {
    external: {
        source: "folder",
        path: "configuration/keys"
    },
    internal: {
        source: "file",
        path: "configuration/integrity.jwks"
    }
};
