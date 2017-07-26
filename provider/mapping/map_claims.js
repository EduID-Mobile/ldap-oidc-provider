"use strict";
// const debug = require("debug")("test");
/**
 * mapClaims() uses a mapping and a source data set to transposes it into the
 * target structure. This function just returns what it finds in the LDAP
 * datasets.
 *
 * forceArray can be used to force certain claims to be arrays even it they
 * contain only a single value. This is not specified in the mapping, because
 * a mapping implementor must not override the internal requirements.
 *
 * Feel free to implement other mappings on top of this function.
 *
 * @param {Object} mappingObject
 * @param {Object} sourceObject
 * @param {Array} forceArray (optional)
 * @returns {MIXED} if found the claim value, otherwise null.
 */

function valueSplit(arr, sep) {
    if (typeof arr === "string") {
        return arr.split(sep);
    }
    return arr.map((e) => e.split(sep));
}

function mapClaim(claim, value, target) {
    if (value !== null) {
        let retval = target;

        if (claim.indexOf(".") >= 0) {
            const aClaims = claim.split(".");

            claim = aClaims.pop();

            // create set objects, set objects might be nested
            // anywhere in the JSON. Therefore, we create all
            // intermediates if they do not exist.
            aClaims.map(set => {
                if (!retval[set]) {
                    retval[set] = {};
                }
                retval = retval[set];
            });
        }

        retval[claim] = value;
    }
    return target;
}

function valueReplace(val, swap) {
    if (typeof val === "string") {
        return Object.keys(swap).indexOf(val) < 0 ? val : swap[val];
    }
    return val
        .map((v) => Object.keys(swap).indexOf(v) < 0 ? v : swap[v])
        .filter((v) => v !== null && typeof v !== undefined);
}

function valueJson(val) {
    let retval = null;

    try {
        if (typeof val === "string") {
            retval = JSON.parse(val);
        }
        else if (Array.isArray(val)) {
            retval =  val.map((v) => JSON.parse(v));
        }
    }
    catch (err) {
        retval = null;
    }
    return retval;
}

function valueAssign(val, attrMap) {
    if (Array.isArray(val) && Array.isArray(attrMap)) {
        let retval = {};

        attrMap.reverse();
        val.reverse();

        attrMap.map((m,i) => {
            if (val[i] !== null && typeof val[i] !== "undefined") {
                retval[m] = val[i];
            }
        });
        // fill remaining elements into the last attribute
        if (attrMap.length < val.length) {
            const len = attrMap.length - 1;

            retval[attrMap[len]] = val.slice(len).reverse();
        }

        // reverse back otherwise the code breaks
        attrMap.reverse();
        return retval;
    }
    return val;
}

function valueExtend(val, suffix) {
    if (typeof suffix === "string"){
        if (Array.isArray(val)) {
            return val.map((v) => typeof v === "string" ? `${v}${suffix}` : v );
        }
        if (typeof val === "string") {
            return `${val}${suffix}`;
        }
    }
    return val;
}

function handleClaim(claim, source, map, forceArray) {
    let c = findClaim(claim, source, map);

    if (c &&
        forceArray &&
        forceArray.indexOf(claim) >= 0 &&
        !Array.isArray(c)) {

        c = [c];
    }
    return c;
}

function findClaim(claim, source, map) {
    if (!(map && map[claim])) {
        return null;
    }

    let cMap = map[claim];

    // handle 1:1 mapping
    if (typeof cMap === "string" &&
        source[cMap]) {

        return source[cMap];
    }

    // handle 1:n mapping
    if (!Array.isArray(cMap)) {
        return null;
    }

    let i, j, co;

    for (i = 0; i < cMap.length; i++) {
        co = cMap[i];

        // handle 1:n flat mapping
        if (typeof co === "string" &&
            source[co]) {

            return source[co];
        }

                // handle 1:n structured mapping
        if (typeof co === "object") {
            let attr = co.attribute;

            if (!Array.isArray(attr)) {
                attr = [attr];
            }
            // if attribute is an array then we loop that array
            // until we found a match
            for (j = 0; j < attr.length; j++) {
                if (source[attr[j]]) {
                    let rv = source[attr[j]];

                    if (typeof rv === "undefined") {
                        rv = null;
                    }

                    if (rv !== null &&
                        co.label &&
                        co.label.length &&
                        typeof rv === "object" &&
                        !Array.isArray(rv)){
                        if (rv[co.label]) {
                            rv =  rv[co.label];
                        }
                        else {
                            rv = null;
                        }
                    }

                    if (rv !== null && co.separator) {
                        rv = valueSplit(rv, co.separator);
                    }

                    if (rv !== null && co.replace) {
                        rv = valueReplace(rv, co.replace);
                    }

                    if (rv !== null && co.json) {
                        rv = valueJson(rv);
                    }

                    if (rv !== null && co.assign && Array.isArray(rv)) {
                        rv = valueAssign(rv, co.assign);
                    }

                    if (rv !== null !== null && co.suffix) {
                        rv = valueExtend(rv, co.suffix);
                    }

                    if (rv !== null) {
                        if (Array.isArray(rv) && rv.length === 1) {
                            return rv[0];
                        }
                        return rv;
                    }
                }
            }
        }
    }

    return null;
}

module.exports = function mapClaims(map, source, forceArray = null) {
    if (!(map && source)) {
        return source;
    }

    let mapTarget = {};

    Object.keys(map).map(claim => {
        mapTarget = mapClaim(claim, handleClaim(claim, source, map, forceArray), mapTarget);
    });

    return mapTarget;
};
