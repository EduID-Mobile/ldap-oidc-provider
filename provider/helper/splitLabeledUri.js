"use strict";

module.exports = function splitUrls(obj) {
    let urls = {}, label, url;

    if (typeof obj.labeledURI === "string") {
        obj.labeledURI = [obj.labeledURI];
    }

    if (Array.isArray(obj.labeledURI)) {
        // not transformed already
        obj.labeledURI.map(u => {
            [url, label] = u.split(" ", 2);

            if (label) {
                label = label.replace(/[\[\]]/, "");
                if (!urls[label]) {
                    urls[label] = url;
                }
                else {
                    if (!Array.isArray(urls[label])) {
                        urls[label] = [urls[label]];
                    }
                    urls[label].push(url);
                }
            }
        });
    }
    else {
        urls = obj.labeledURI;
    }

    obj.labeledURI = urls;
    // return obj;
};
