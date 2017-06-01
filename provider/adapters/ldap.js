"use strict";

/**
 * The LDAP Client Adapter handles the different requests related to the client
 * Information. This covers information for the following adapter types:
 *
 * -   Client
 * -   ClientCredentials
 *
 * Both adapters actually work the same on LDAP, because the client credentials
 * are stored with the Client's Metadata. Given the design of oidc-provider,
 * the adapter will do two requests on the same information.
 */

const getMapping = require("../mapping");
const mapClaims = require("../mapping/map_claims");
const findConnection = require("./ldapmanager");

// these are oidc-provider specific and are not optional for the mapping
const forceArray = [
    "redirect_uris",
    "post_logout_redirect_uris",
    "request_uris",
    "response_types",
    "default_acr_values",
    "grant_types",
    "request_uris"
];

class LdapClientAdapter {

  /**
   *
   * Creates an instance of MyAdapter for an oidc-provider model.
   *
   * @constructor
   * @param {string} name Name of the oidc-provider model. One of "Session", "AccessToken",
   * "AuthorizationCode", "RefreshToken", "ClientCredentials" or "Client", "InitialAccessToken",
   * "RegistrationAccessToken"
   *
   */
    constructor(name, cfg) {
        this.log = cfg.log;
        this.name = name;
        this.org  = cfg.directoryOrganisation[name];
        this.ldap = findConnection(this.org.source, cfg);
        this.mapping = getMapping(name);
    }

    transposeAttributes(result, scope=null) {
        if (scope) {
            return mapClaims(this.mapping[scope], result, forceArray);
        }
        return mapClaims(this.mapping, result, forceArray);
    }

  /**
   * Returns the attributes for an entry
   */
    async find(id) {
        if (!(this.org.id && this.org.id.length)) {
            return null;
        }
        let baseDN = null;

        if (this.org.base) {
            baseDN = this.org.base;
        }

        const scope = this.org.scope || "sub";
        let filter = ["&", `objectClass=${this.org.class}`, `${this.org.id}=${id}`];

        if (this.org.filter &&
            this.org.filter.length) {

            filter = filter.concat(this.org.filter);
        }

        const entries = await this.ldap.find(filter, baseDN, scope);

        if (!(entries && entries.length)) {
            return null;
        }
        const result = this.transposeAttributes(entries[0]);

        // loop through related information.
        const subclaims = await Promise.all(this.org.subclaims.map((set) => this.loadClaimset(set, entry)));

        // merge the subclaims into the main result set

        return this.mergeClaims(result, subclaims);
    }

    mergeClaims(result, subClaims) {
        return subClaims.reduce((acc, val) =>
            Object.keys(val).map((k) => {
                if (!Array.isArray(val[k])) {
                    val[k] = [val[k]];
                }
                if (!acc[k]) {
                    acc[k] = [];
                }
                if (acc[k] && !Array.isArray(acc[k])) {
                    acc[k] = [acc[k]];
                }
                acc[k] = acc[k].concat(val[k]);
                return acc;
            }),
            result);
    }

    async loadClaimset(set, entry) {
        const basedn = set.base || entry.dn;
        const idfield = set.id || this.org.id;
        const scope = set.scope || this.org.scope || "sub";

        let filter = [`${idfield}=${entry[this.org.id]}`];

        if (set.class) {
            filter.push(`objectClass=${set.class}`);
        }

        if (set.filter &&
            set.filter.length) {
            filter = filter.concat(set.filter);
        }

        if (filter.length > 1) {
            filter.unshift("&");
        }

        const entries = await this.ldap.find(filter, basedn, scope);

        if (!(entries && entries.length)) {
            return null;
        }

        return entries.map((subEntry) => this.transposeAttributes(subEntry, set.claim));
    }

    upsert(id, payload, expiresIn) { // eslint-disable-line no-unused-vars
      // noop!
      // dynamic configuration is not supported
        Promise.reject("NotSupported");
    }

    consume(id) { // eslint-disable-line no-unused-vars
      // noop!
      // makes no sense for clients
        Promise.reject("NotSupported");
    }

    destroy(id) { // eslint-disable-line no-unused-vars
      // noop!
      // all eduid services are configured via the federation management and not
      // via dynamic client registration.
        Promise.reject("NotSupported");
    }
}

module.exports = LdapClientAdapter;
