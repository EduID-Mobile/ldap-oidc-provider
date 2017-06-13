"use strict";
/* eslint-disable */

const { expect } = require("chai");

const Manager = require("../provider/adapters/ldapmanager");
const LDAPConnection = require("../provider/adapters/ldapconnection");

describe("LDAP Manager", function() {
    it("loads", function() {
        expect(Manager).to.be.a("function");
    });

    it("get name", function() {
        const cfg = {ldap: { connection:{
            common: {
                url: "ldap://192.168.56.102:389",
                bind: "cn=oidc,ou=configurations,dc=local,dc=dev",
                base: "dc=local,dc=dev",
                password: "oidc"
            },
            federation: {
                url: "ldap://192.168.56.105:389",
                bind: "cn=oidc,ou=configurations,dc=local,dc=dev",
                base: "dc=local,dc=dev",
                password: "oidc"
            }}
        }};

        const find = Manager(cfg);

        const c1 = find("common");
        expect(c1).to.be.instanceof(LDAPConnection);
        const c2 = find("common");
        expect(c2).to.be.instanceof(LDAPConnection);
        expect(c2).to.be.equal(c1);
    });

    it("get multi name", function() {
        const cfg = {ldap: { connection:{
            common: {
                url: "ldap://192.168.56.102:389",
                bind: "cn=oidc,ou=configurations,dc=local,dc=dev",
                base: "dc=local,dc=dev",
                password: "oidc"
            },
            federation: {
                url: "ldap://192.168.56.105:389",
                bind: "cn=oidc,ou=configurations,dc=local,dc=dev",
                base: "dc=local,dc=dev",
                password: "oidc"
            }}
        }};

        const find = Manager(cfg);

        const c1 = find("common");
        expect(c1).to.be.instanceof(LDAPConnection);
        const c2 = find("federation");
        expect(c2).to.be.instanceof(LDAPConnection);
        expect(c2).to.be.not.equal(c1);
        const c3 = find("federation");
        expect(c3).to.be.equal(c2);
        const c4 = find("common");
        expect(c4).to.be.equal(c1);
    });
});
