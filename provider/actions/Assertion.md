# Assertion Structure

```
{
    sub : username (authentication phase) or ID (authorization phase)
    iss : registered client (authentication phase) or device instance (authorization phase)
    aud : AP Token endpoint
    azp (+ cnf.jwk): instance uuid (device id). becomes iss (authentication phase)
    azp (+ cnf.kid): redirect_uri of the academic service (authorization phase)
    iat : timestamp when the assertion has been created.
    exp : timestamp until when the assertion is valid (e.g. iat + 5 min.)
    cnf : public confirmation key (cnf.jwk, authentication phase)/confirmation key reference (cnf.kid, authorization phase)
    x_crd : credentials (e.g. password)
    x_jwt : access token issued by AP to the assertion issuer (optional)
}
```

All assertions are encrypted for the AP (that is this service).

During the authentication phase the Trust Agent App needs to register its device (via the azp claim)

# 1.1 Request

[-] 1.1.1 RFC 6749: The RP MUST forward the request as POST to the AP.

[-] 1.1.2 The RP MUST forward all incoming parameters to the AP.

[-] 1.1.3 The RP MUST add a scope parameter according to the required information from the AP.

[-] 1.1.4 If the incoming request already has a scope parameter then the RP MUST extend it to match its requirements.

[x] 1.1.5 RFC 7523: The grant type MUST be urn:ietf:params:oauth:grant-type:jwt-bearer

[x] 1.1.6 RFC 7521: The token endpoint MUST accept the assertion parameter.

[-] 1.1.7 The RP MUST identify the AP either via unique redirection URLs OR via the AP's public key used for encrypting the assertion.

[-] 1.1.8 The RP SHOULD reject any assertion that exposes an unknown kid in the assertion's header.

[-] 1.1.9 The RP MUST reject any assertion if the AP cannot be identified.

# 1.2 Parameters

[x] 1.2.1 RFC 7800: token request MUST include assertion parameter.

[x] 1.2.2 RFC 7800: token request MUST include scope parameter.

# 1.3 Scope validation

[x] 1.3.1 OIDC Core 1.0: scope parameter MUST include "openid".

# 2 Decrypt assertion

[x] 2.1 Assertions MUST be encrypted. (implemeted as MAY)

[x] 2.2 Assertions MUST be encrypted for the AP.

# 3.1 verify JWT

[x] 3.1.1 Assertion envelope payload MUST be a JWT serialisation.

[x] 3.1.2 The assertion envelope payload MUST be either in compact or JSON serialization.

[x] 3.1.3 CHECK: RFC7517 (JWT): The payload header MUST include a kid.

[x] 3.1.4 Assertion payload MUST include the iss, aud, and sub claims.

[x] 3.1.5 The assertion payload MAY includ iat, nbf, and exp claims. These claims MUST conform to RFC 7519 (JWT).

[x] 3.1.6 If iat and nbf are used without the exp claims, they MUST NOT be older than 30min.

[x] 3.1.7 If no cnf claim is present, then the clientId MUST match the iss claim.

[x] 3.1.8 If the cnf claim holds a JWK, then the clientId MUST match the iss claim.

[x] 3.1.9 If the cnf claim holds a kid, then assertion header's kid MUST match it.

[x] 3.1.10 The assertions payload MUST contain an azp.

[ ] 3.1.11 If azp is present and the client ID not equals the assertion's issuer claim, then the azp MUST match one of the client's redirect URIs.

[ ] 3.1.12 If the client ID matches the assertion's issuer claim and an azp claim is present, then the client MUST be registered for proxy_authorization.

[ ] 3.1.13 proxy_authorization SHOULD be granted only to trust agents.

# 3.2 validate JWT

[x] 3.2.1 The assertion MUST be signed by the TA.

[x] 3.2.2 If the cnf claim holds a JWK, the assertion MUST be signed using the TA's client key.

[x] 3.2.3 If the cnf claim holds a kid, then the assertion MUST be signed using the referred key.

[x] 3.2.4 If the cnf claim holds a kid, the the assertion's sub MUST match the cnf key's sub claim.

[x] 3.2.5 If the cnf claim holds a kid, the the assertion's iss MUST match the cnf key's azp claim.

[x] 3.2.6 If the cnf claim holds a kid, the the cnf key's iss claim MUST refer to a valid client.

# 4.1 Authenticate

[x] 4.1.1 The assertion MUST contain a cnf claim.

[x] 4.1.2 The cnf claim MUST contain a JWK.

[x] 4.1.3 The cnf JWK MUST contain a kid.

[ ] 4.1.4 The cnf JWK kid MUST be unique.

[ ] 4.1.5 The azp claim MUST contain a unique id for the TA instance.

[x] 4.1.6 The assertion MUST NOT include a x_jwt claim.

[x] 4.1.7 The assertion MUST include a x_crd claim.

[x] 4.1.8 The x_crd claim MUST be a string or an object.

[x] 4.1.9 The assertion's sub claim and x_crd claims MUST authenticate a user as specified in the password flow (RFC 6749).

[ ] 4.1.10 The assertion's iss MUST match the request's client ID.

# 4.2 Authorize using an jwt identifier (x_jwt)

[x] 4.2.1 The assertion MUST include a x_jwt claim.

[ ] 4.2.2 The assertion MUST NOT include a x_crd claim.

[x] 4.2.3 The assertion MUST contain a cnf claim containing a kid.

[x] 4.2.4 The asserion's azp claim MUST match a redirectUri of the client making the request.

[x] 4.2.5 The x_jwt MUST contain the iss claim.

[x] 4.2.6 The x_jwt MUST NOT contain the aud claim.

[x] 4.2.7 The x_jwt MUST NOT contain the sub claim.

[ ] 4.2.8 The x_jwt MUST be signed.

[ ] 4.2.9 The AP MAY reject x_jwt if it cannot verify the signature.

[ ] 4.2.10 The AP MAY accept x_jwt from unknown issuers without verifying the signature.

[x] 4.2.11 The x_jwt claim MUST be in compact serialization.
