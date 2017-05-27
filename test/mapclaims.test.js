"use strict";

/* eslint-disable */

const { expect } = require("chai");

const mapClaims = require("../provider/mapping/map_claims");

describe("MapClaims", () => {
    let mapping = {
        "direct": "dm",
        "masked_direct": ["mdm"],
        "flat": ["f1", "flatTest"],
        "skipme": [],
        "sub.set": ["s", "subset"],
        "deep.sub.set": ["d", "dss"],
        "labeled": [{attribute: "labeledUri", label: "test"}],
        "processed": [{attribute: "data", json: true}],
        "mixed": ["uri", {"attribute": "labeledUri", "label": "mixed"}],
    };
    const forceArray = ["flat"];

    it("direct mapping", () => {
        const source = {
            "dm": "hello"
        };

        const result = mapClaims(mapping, source);

        expect(result).to.be.an("object");
        expect(result).to.have.keys("direct");
        expect(result.direct).to.be.a("string");
        expect(result.direct).to.be.equal("hello");

    });

    it("masked direct mapping", () => {
        const source = {
            "mdm": "hello"
        };

        const result = mapClaims(mapping, source);

        expect(result).to.be.an("object");
        expect(result).to.have.keys("masked_direct");
        expect(result.masked_direct).to.be.a("string");
        expect(result.masked_direct).to.be.equal("hello");
    });

    it("missing", () => {
        const source = {
            "missing": "hello"
        };

        const result = mapClaims(mapping, source);

        expect(result).to.be.an("object");
        expect(result).to.be.empty;
    });

    it("flat mapping simple first", () => {
        const source = {
            f1: "hello"
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("flat");
        expect(result.flat).to.be.a("string");
        expect(result.flat).to.be.equal("hello");
    });

    it("flat mapping simple second", () => {
        const source = {
            flatTest: "world"
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("flat");
        expect(result.flat).to.be.a("string");
        expect(result.flat).to.be.equal("world");
    });

    it("flat mapping duplicate", () => {
        const source = {
            f1: "hello",
            flatTest: "world"
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("flat");
        expect(result.flat).to.be.a("string");
        expect(result.flat).to.be.equal("hello");
    });

    it("flat mapping simple array", () => {
        const source = {
            f1: ["hello", "world"]
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("flat");
        expect(result.flat).to.be.a("array");
        expect(result.flat).to.have.lengthOf(2);
        expect(result.flat.join(" ")).to.be.equal("hello world");
    });

    it("skip mapping", () => {
        const source = {
            f1: "hello",
            f2: "world"
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("flat");
        expect(result.flat).to.be.a("string");
        expect(result.flat).to.be.equal("hello");
    });

    it("forceArray", () => {
        const source = {
            f1: "hello"
        };

        const result = mapClaims(mapping, source, forceArray);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("flat");
        expect(result.flat).to.be.an("array");
        expect(result.flat).to.have.lengthOf(1);
        expect(result.flat.join(" ")).to.be.equal("hello");
    });

    it("labeled mapping", () => {
        const source = {
            labeledUri: {test: "hello"}
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("labeled");
        expect(result.labeled).to.be.a("string");
        expect(result.labeled).to.be.equal("hello");
    });

    it("json mapping ok", () => {
        const source = {
            data: '{"test": "hello"}'
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("processed");
        expect(result.processed).to.be.a("object");
        expect(result.processed).to.have.keys("test");
        expect(result.processed.test).to.be.equal("hello");
    });

    it("json mapping broken", () => {
        const source = {
            data: '{"test": "hello"'
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.empty;
    });

    it("mixed mapping flat", () => {
        const source = {
            uri: "hello"
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("mixed");
        expect(result.mixed).to.be.a("string");
        expect(result.mixed).to.be.equal("hello");
    });

    it("mixed mapping complex", () => {
        const source = {
            labeledUri: { mixed: "hello" }
        };

        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("mixed");
        expect(result.mixed).to.be.a("string");
        expect(result.mixed).to.be.equal("hello");
    });

    it("subset mapping simple", () => {
        const source = {
            s: "hello"
        };
        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("sub");
        expect(result.sub).to.be.an("object");
        expect(result.sub).to.have.keys("set");
        expect(result.sub.set).to.be.a("string");
        expect(result.sub.set).to.equal("hello");
    });

    it("subset mapping deep", () => {
        const source = {
            dss: "hello"
        };
        const result = mapClaims(mapping, source);
        expect(result).to.be.an("object");
        expect(result).to.have.keys("deep");
        expect(result.deep).to.be.an("object");
        expect(result.deep).to.have.keys("sub");
        expect(result.deep.sub).to.be.an("object");
        expect(result.deep.sub).to.have.keys("set");
        expect(result.deep.sub.set).to.be.a("string");
        expect(result.deep.sub.set).to.equal("hello");
    });
});
