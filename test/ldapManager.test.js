"use strict";
/* eslint-disable */

const { expect } = require("chai");

const Manager = require("../provider/adapters/ldapmanager");

describe("LDAP Manager", function() {
    it("loads", function() {
        expect(Manager).to.be.a("function");
    });
});
