"use strict";

// This module contains the Adapter for the account information

const Mapping = require("./mapping")("Account");
const mapClaims = require("./mapping/map_claims.js");

/**
 * @class Account
 *
 * The Account class handles the account information from the directory.
 */

class Account {
    constructor(userdata) {
        this.user = userdata;

        if (this.user) {
            this.accountId = this.user.uid;
        }
    }

    /**
     * Returns the OIDC claims for the id-token.
     *
     * This function is used by oidc-provider.
     * The claims method transposes the LDAP object into an id-token object.
     * If this function returns null, no user is set.
     */
    claims() {
        if (!this.userClaims) {
            this.userClaims = mapClaims(Mapping, this.user);
        }

        return this.userClaims;
    }
}

module.exports = Account;
