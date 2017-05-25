# LDAP mappings

One can store most of the information into an LDAP directory. However, the
internal formats defined in the LDAP Schemas differ from those of OIDC.

The mapping files provide the means for defining mappings between the two
formats. The Mappings also allow to use localized schemas with this provider.

A mapping is only added to the result if the claim requests returns a
non-null value.

A mapping can be one of the following types
-   1:1 mapping with the mapping value being a string
-   1:n flat mapping with the mapping value being an array of strings
-   1:n structured mapping with the mapping value being an array of
    objects.

1:n flat mappings will look for the first attribute set in the list
being set in the LDAP entry. The first matching attribute will yield the result.
All other attribute names listed for the claim are ignored.

1:n structured mappings work similarly to the flat mappings. The main
difference is that these mappings are key value pairs, with the key
referring to the entry's attribute and the value informs, how the value
should get mapped. If the value is an object it MUST have the key
"label" OR the key "id". The label key is used for labeledURI attributes
for distinguishing different URI labels. The id key is used for
selecting the n-th value of an attribute, where n is the provided id.
If the value is a string, then the value is handled as an index.

OIDC organizes some claims into subsets. Each set represents a JSON object with
individual claims.

One can define the mapping for these nested claims via dot-notation. I.e., the
nested structure is indicated by dots. For example ```address.street_name```
will store the claim as ```{"address":{"street_name":"YOUR CLAIM VALUE"}}```. It
is possible to deeply nested structures by adding additional levels that are
separated by dots. E.g., ```this.is.a.deeply.nested.claim``` will result in
```{"this":{"is":{"a":{"deeply":{"nested":{"claim": "CLAIM VALUE"}}}}}}```

Please note, LDAP schemas may allow multiple values for attributes. presently
the mapping allows no selection of individual attribute values. Instead all
values are included in the result set in arrays. This may cause problems where
OIDC requires single values.

In order to use the mapping logic, an adapter has to import the
```mapping/map_claims``` module.

## Example

```
{
  "family_name": ["sn", "surname"], // 1:n flat mapping
  "middle_name": [],                // no mapping
  "nickname": "displayName",        // 1:1 mapping
  "locale": ["preferredLanguage"],  // 1:1 mapping masked as 1:n flat.
  "profile": [{"attribute": "labeledURI", "label": "profile"}], // 1:n structured
  "jwks": [{"attribute": "jwks", "json": true}], // json mapping
  "address.postal_code": ["postalCode"] // subset mapping
}
```
