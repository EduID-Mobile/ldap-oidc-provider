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

    transposeAttributes(result) {
        return mapClaims(this.mapping, result, forceArray);
    }

  /**
   * Return previously stored instance of an oidc-client.
   *
   * @return {Promise} Promise fulfilled with either Object (when found and not dropped yet due to
   * expiration) or falsy value when not found anymore. Rejected with error when encountered.
   * @param {string} id Identifier of oidc-provider model
   *
   */
    async find(id) {
        if (!(this.org.id && this.org.id.length)) {
            return null;
        }
        let baseDN = null;

        if (this.org.base) {
            baseDN = this.org.base;
        }

        const result = await this.ldap.find(["&", `objectClass=${this.org.class}`, `${this.org.id}=${id}`], baseDN);

        if (!(result && result.length)) {
            return null;
        }
        let result = this.transposeAttributes(result[0]));

        // loop through related information.

        return result;
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
