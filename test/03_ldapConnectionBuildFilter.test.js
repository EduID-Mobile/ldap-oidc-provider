"use strict";
/* eslint-disable */

const { expect } = require("chai");

const LDAPConnection = require("../provider/adapters/ldapconnection.js");

const conf = {
    url: "ldap://192.168.56.102:389",
    bind: "cn=oidc,ou=configurations,dc=local,dc=dev",
    base: "dc=local,dc=dev",
    password: "oidc"
};

describe("LDAPConnectionBuildFilter", function() {
    const conn   = new LDAPConnection(conf);

    it("loads", function() {
        expect(LDAPConnection).to.be.a("function");
    });

    it("simple string filter", function() {
        const filter = "foo=bar";
        const result = conn.buildFilter(filter);

        expect(result).to.be.equal(`(${filter})`);
    });

    it("simple array filter", function() {
        const filter = ["foo=bar"];

        const result = conn.buildFilter(filter);

        expect(result).to.be.equal("(foo=bar)");
    });

    it("simple not conjunction", function() {
        const filter = ["!","foo=bar"];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(!(foo=bar))");
    });

    it("too long not conjunction", function() {
        const filter = ["!","foo=bar", "bar=baz"];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(!(foo=bar))");
    });

    it("simple and conjunction", function() {
        const filter = ["&","foo=bar","bar=baz"];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(&(foo=bar)(bar=baz))");
    });

    it("single and conjunction", function() {
        const filter = ["&","foo=bar"];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(foo=bar)");
    });

    it("long and conjunction", function() {
        const filter = ["&","foo=bar","bar=baz","baz=bar"];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(&(foo=bar)(bar=baz)(baz=bar))");
    });

    it("simple or conjunction", function() {
        const filter = ["|","foo=bar","bar=baz"];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(|(foo=bar)(bar=baz))");
    });

    it("single or conjunction", function() {
        const filter = ["|","foo=bar"];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(foo=bar)");
    });

    it("and with right nested or conjunction", function() {
        const filter = ["&","foo=bar",["|","foo=bar","bar=baz"]];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(&(foo=bar)(|(foo=bar)(bar=baz)))");
    });

    it("and with left nested or conjunction", function() {
        const filter = ["&",["|","foo=bar","bar=baz"],"foo=bar",];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(&(|(foo=bar)(bar=baz))(foo=bar))");
    });

    it("or with right nested and conjunction", function() {
        const filter = ["|","foo=bar",["&","foo=bar","bar=baz"]];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(|(foo=bar)(&(foo=bar)(bar=baz)))");
    });

    it("or with left nested and conjunction", function() {
        const filter = ["|",["&","foo=bar","bar=baz"],"foo=bar"];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(|(&(foo=bar)(bar=baz))(foo=bar))");
    });

    it("or with left and right nested and conjunction", function() {
        const filter = ["|",["&","foo=bar","bar=baz"],["&","foo=bar","baz=bar"]];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(|(&(foo=bar)(bar=baz))(&(foo=bar)(baz=bar)))");
    });

    it("multi literal string", function() {
        const filter = ["foo=bar","bar=baz"];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(foo=bar)");
    });

    it("empty literal string", function() {
        const filter = [""];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("");
    });

    it("and conjunction with empty literal right", function() {
        const filter = ["&","foo=bar",""];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(foo=bar)");
    });

    it("and conjunction with empty literal left", function() {
        const filter = ["&","","foo=bar"];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(foo=bar)");
    });

    it("multi nested literal", function() {
        const filter = [[[["foo=bar"]]]];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(foo=bar)");
    });

    it("multi nested not", function() {
        const filter = [["!", [[["foo=bar"]]]]];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(!(foo=bar))");
    });

    it("multi nested and", function() {
        const filter = [["&", [[["foo=bar"]]],[["bar=baz"]]]];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(&(foo=bar)(bar=baz))");
    });

    // the following two tests are within the logic requirements, but
    // are probably a bit counter intuitive.
    it("multi nested and with literal list", function() {
        const filter = [["&", [[["foo=bar", "baz=bar"]]],[["bar=baz"]]]];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(&(foo=bar)(bar=baz))");
    });

    it("multi nested and nested literals", function() {
        const filter = [["&", [[["foo=bar"], "baz=bar"]],[["bar=baz"]]]];

        const result = conn.buildFilter(filter);
        expect(result).to.be.equal("(&(foo=bar)(bar=baz))");
    });
});
