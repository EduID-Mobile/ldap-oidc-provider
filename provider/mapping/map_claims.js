"use strict";

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
                    if (co.label && co.label.length && source[attr[j]][co.label]) {
                        return source[attr[j]][co.label];
                    }
                    if (co.suffix) {
                        return source[attr[j]] + `@${co.suffix}`;
                    }
                    if (co.json) {
                        let rv;

                        try {
                            rv = JSON.parse(source[attr[j]]);
                        }
                        catch (err) {
                            console.log("JSON ERROR: " + err.message); // eslint-disable-line no-console
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
