## LDAP OIDC Extensions

Node OIDC Implementation for Directory Managed Users and Clients.

### Getting started

The LDAP OIDC Provider requires a recent version of [Node](http://nodejs.org).
This version has been tested on both, LTS and the Current version of Node.

### Installation

1.  Have access to an LDAP repository.
2.  Install REDIS on the local machine.
3.  Download eduid-oidc to the local machine and unpack it.
4.  Run ```cd ldap-oidc-provider; npm install```
5.  change the file ```configuration/settings.js``` to match your environment
6.  copy your local keys into the key directories.
8.  Create a Web-server Proxy, so nodejs is not directly exposed and restart the
    web-server.
9.  Run ```npm start```

### Advanced configuration

#### Directory organization

In order to process the directory appropriately, the organization of information
in the directory must get configured. The directory configuration has three
parts.

1.  The query parameters.
2.  The data source.
3.  The mapping from LDAP to OIDC attributes.

The query parameters and data sources are configured in the
[provider_settings.js](provider/provider_settings.js).

The query parameters allow the OIDC provider to select the correct source for
OIDC information.

All data types defined in the Object ```ldap.organisation``` are considered
to be managed in a directory.

For each data type the following attributes can get configured:

*   class - the object class that identifies all records of that data type.
*   id - a unique identifier attribute of the LDAP record.
*   source - the data source (default ```common```).
*   bind - the identifying property that for authenticating agents. If bind is missing, then the id is used.
*   base - the bind DN for the data type. If present, this overrides the base configuration of the data source.
* subclaims - rules for getting additional claim information
* mapping - configuration for mapping the LDAP attributes into OIDC claims. This configuration points to a mapping file.

Example:
```json
{
    "Account": {
        "class": "inetOrgPerson",
        "bind": "mail",
        "id": "uid",
        "source": "common",
        "base": "ou=users,dc=local,dc=dev"
    },
    "Client": {
        "class": "organizationalRole",
        "id": "cn",
        "source": "common",
    }
}
```

The LDAP Provider allows the IDP to use different directories as sources for
OIDC data. All data sources must be named in the ```ldap.connection```-configuration.
the keys of the connections must match the values used as source in the
configuration section ```ldap.organization```.

For each ```connection``` configured as a data source, LDAP OIDC will keep
a separate connection open.

The following configurations are required for a data source:

*   url - an ```ldap``` or ```ldaps``` URL to the directory host.
*   base - the base DN for querying the system.
*   bind - the bind DN for connecting to the directory.
*   password - the bind password for connecting to the directory.

The following example illustrates the configuration of two connections.

**Note**: All records for one data type must be kept in one directory. The LDAP
provider does not support partitioned user bases across directories.

```json
{
    "ldap": {
        "connection": {
            "common": {
                "url": "ldap://server1:389",
                "bind": "cn=oidc,ou=configurations,dc=local,dc=dev",
                "base": "dc=local,dc=dev",
                "password": "oidc"
            },
            "federation": {
                 "url": "ldap://server2:389",
                 "bind": "cn=oidc,ou=services,dc=foo,dc=bar",
                 "base": "dc=local,dc=foo",
                 "password": "foobar"
            }
        }
    }
}
```

LDAP Provider acknowledges that identity management in different organizations
is based on different schemas. This implementation allows administrators to
create their own mappings from LDAP to OIDC user profiles.

The core mappings work fine with the [provided LDAP schemas](schemas). In order
to work with custom local schemas, it is required to customize the mapping rules
in the [```provider/mapping```](provider/mapping) directory.

#### Cryptographic keys

OIDC relies on encryption. The provider needs to have access to its own keys.

The OIDC provider supports two types of keys.

1.  External keys, used for signing and encrypting data that is exchanged with
    clients.
2.  Internal keys for guaranteeing the integrity of internal data (including
    Cookies).

For external keys it is recommended to use RSA or Elliptic Curve encryption.
For internal keys it is sufficient to use octet keys. Normally one internal key
is sufficient.

The provider can automatically import the server keys from different
locations. PEM formatted keys can be imported on the fly during startup from a
directory.

For pointing the provider to the correct locations for obtaining its keys, use
the certificates configuration in you ```settings.json```-file.

### Manage OAuth2 and OIDC Services in a LDAP Directory

This provider is designed for a federation of registered clients. This
federation can get managed in a LDAP directory. The LDAP provider requires
these clients to get mapped into the internal data structure for the underlying
OIDC provider.   

### LDAP Settings

### Persistency Storage

The LDAP OIDC Provider has two layers of Persistency.

1.  A LDAP directory
2.  A REDIS data store

The LDAP directory is used for long lived and centrally managed resources,
such as accounts and services.

The REDIS data store provides persistency for short lived and temporary
information, such as user sessions and service auth tokens.

Service administrators may decide on which component they use for what kind of
information.

## Web Server Configuration

It is recommended to mask the OIDC provider behind a web-server/proxy server.

### Apache Configuration

On Apache 2.4 one needs to activate the proxy module and using the
[ProxyPass](https://httpd.apache.org/docs/2.4/mod/mod_proxy.html#proxypass)
configuration that points to the configured port on the installation server.

The SSL termination removes a bit load from nodejs. It is important to inform
the service that it runs behind an ssl termination, so it can set the URLs
correctly. It is configured as following:

First, one needs to activate mod_proxy and mod_headers, if they are not
active already.

```
> a2enmod proxy   # 1
> a2enmod headers # 2
```

Step 1 is required for masquerading nodejs behind Apache. It provides the
Proxy* configuration options.

Step 2 is required for the SSL termination. It provides the RequestHeader
option.

The server's VirtualHost section should be configured as following:

```
RequestHeader set X-Forwarded-Proto "https" env=HTTPS # 1
RequestHeader set X-Forwarded-Ssl on                  # 1

ProxyPreserveHost On
ProxyAddHeaders On
ProxyRequests Off
# point the url to the host oidc is running on
ProxyPass /oidc http://localhost:3000                 # 2
```

Step 1 is required for SSL termination.

Step 2 hands the requests to nodejs.
