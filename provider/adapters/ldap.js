"use strict";

const log = require("debug")("ldap-oidc:ldap")

;
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

// const getMapping = require("../mapping");
const mapClaims = require("../mapping/map_claims");

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
    constructor(name) {
        this.name = name;
        this.org = {};
    }

    connection(connection) {
        this.ldap = connection;
    }

    transform(mapping) {
        this.mapping = mapping;
    }

    organization(org) {
        this.org = org;
    }

    transposeAttributes(result, scope = null) {
        if (!this.mapping) {
            return result;
        }
        let retval;

        if (scope && this.mapping[scope]) {
            retval = mapClaims(this.mapping[scope], result, forceArray);
            log("scope free %O", retval);
            return retval;
        }

        retval =  mapClaims(this.mapping, result, forceArray);
        log("scope free %O", retval);
        return retval;
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

        log(`id: ${id}, ${baseDN}`);

        const scope = this.org.scope || "sub";
        let filter = ["&", `objectClass=${this.org.class}`, `${this.org.id}=${id}`];

        if (this.org.filter &&
            this.org.filter.length) {

            filter = filter.concat(this.org.filter);
        }

        log(`use filter: ${JSON.stringify(filter)}`);

        const entries = await this.ldap.find(filter, baseDN, scope);

        if (!(entries && entries.length === 1)) {
            log("found not entries");
            return null;
        }

        log("transpose attributes");
        const result = this.transposeAttributes(entries[0]);

        // loop through related information.
        if (!this.org.subclaims) {
            log("no subclaim handling necessary");
            return result;
        }

        if (!Array.isArray(this.org.subclaims)) {
            this.org.subclaims = [this.org.subclaims];
        }

        log("handle subclaims");

        // FIXME the subclaims request crashes
        const subclaims = [];
        // const subclaims = await Promise.all(this.org.subclaims.map(async (setdef) => await this.loadClaimset(setdef, entries[0])));

        // merge the subclaims into the main result set
        // note, that the subclaims array needs to be flattened
        log("merge subclaims");
        return this.mergeClaims(result, subclaims.reduce((l, c) => l.concat(c), []));
    }

    mergeClaims(result, subClaims) {
        const final = subClaims.reduce((acc, val) => {
            if (val === null) {
                return acc;
            }
            Object.keys(val).map((k) => {
                if (!acc[k]) {
                    acc[k] = val[k];
                }
                else if (acc[k] &&
                        !(acc[k] instanceof Array || typeof acc[k] === "string") &&
                        !(val[k] instanceof Array || typeof val[k] === "string")) {

                    Object.keys(val[k]).map((k2) => {
                        if (!acc[k][k2]) {
                            acc[k][k2] = val[k][k2];
                        }
                        else {
                            if (!(acc[k][k2] instanceof Array)) {
                                acc[k][k2] = [acc[k][k2]];
                            }
                            acc[k][k2] = acc[k][k2].concat(val[k][k2]);
                        }
                    });
                }
                else {
                    if (!(acc[k] instanceof Array)) {
                        acc[k] = [acc[k]];
                    }
                    acc[k] = acc[k].concat(val[k]);
                }
            });
            return acc;
        },
                                       result);

        return final;
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
            return [];
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
