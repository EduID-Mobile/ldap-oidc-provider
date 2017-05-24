"use strict";

/**
 * This module defines the mapping of the user attributes from the directory
 * to OIDC claims.
 *
 * The dot-notation allows one to add subsets.
 */

module.exports = {
    "sub": [{"attribute": ["uid", "userid"], "suffix": "eduid.ch"}],
    "address.street_address": ["street", "streetAddress"],
    "address.locality": ["l", "localityName"],
    "address.region": ["st", "stateOrProvideName"],
    "address.postal_code": ["postalCode"],
    "address.country": ["co", "friendlyCountryName"],
    "email": "mail",
    "email_verified": [],
    "phone_number": ["telephoneNumber"],
    "phone_number_verified": [],
    "name": ["cn", "commonName"],
    "given_name": ["gn", "givenName"],
    "family_name": ["sn", "surname"],
    "middle_name": [],
    "nickname": "displayName",
    "preferred_username": ["username"],
    "birthdate": [],
    "gender": [],
    "zoneinfo": [],
    "locale": ["preferredLanguage"],
    "updated_at": [],
    "profile": [{"attribute": "labeledURI", "label": "profile"}],
    "picture": [{"attribute": "labeledURI", "label": "photo"}],
    "website": [{"attribute": "labeledURI", "label": "Homepage"}]
};
