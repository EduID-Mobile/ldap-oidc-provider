"use strict";
/* eslint-disable */

const { expect } = require("chai");

const Connection = require("../provider/adapters/ldapconnection");
const Adapter = require("../provider/adapters/ldap");

describe("LDAPAdapter", function() {
    it("loads", function() {
        expect(Adapter).to.be.a("function");
    });

    const connectionConfig = {
        url: "ldap://192.168.56.102:389",
        bind: "cn=oidc,ou=configurations,dc=local,dc=dev",
        base: "ou=users,dc=local,dc=dev",
        password: "oidc"
    };

    const accOrgS = {
        class: "inetOrgPerson",
        bind: "mail",
        id: "uid"
    };

    const accOrgC = {
        class: "inetOrgPerson",
        bind: "mail",
        id: "uid",
        scope: "one",
        subclaims: [
            {
                base: "ou=current-affiliations,ou=affiliations,dc=edu-id,dc=ch",
                class: "swissEduIDAffiliationProfile",
                id: "cn",
                claim: "eduid-affiliation"
            }
        ]
    };

    const cliOrg = {
        class: "organizationalRole",
        id: "cn"
    };

    it("transpose attributes without mapping", function () {});
    it("transpose attributes flat", function () {});
    it("transpose attributes with scope with scope mapping", function () {});
    it("transpose attributes with scope without scope mapping", function () {});

    it("merge claims without subscope", function () {});
    it("merge claims with separate subscope", function () {});
    it("merge claims with overlapping subscope", function () {});
    it("merge claims with co-defining subscope", function () {});

    it("find by id", async function() {
        const adapter = new Adapter("Test");
        adapter.organization(accOrgS);
        adapter.connection(new Connection(connectionConfig));

        const result = await adapter.find("1234567890");
        expect(result).to.be.an("object");
        expect(result.uid).is.equal("1234567890");
    });

    it("find by id with sub claims", async function () {});

    it("upsert simple", function () {});
    it("destroy simple", async function () {});
    it("update simple", function () {});
});
