## Running ldap-oidc-provider under docker

We prepare an image under phish108/node-oidc-provider

This container is designed to run as a docker service.

### Preparations

This document assumes that you have a docker or a container framework that can
run docker containers running. This document also assumes that you have a SSL
termination is properly configured for the oidc-container.

There are to ways for running node oidc provider: either as a standalone
container or as a service. The easiest and most common situation for production
purposes is to run node-oidc-provider as a service.

The oidc-provider requires datastores for the different data sets it needs.
Currently, the provider supports redis and LDAP datastores.

If no datastore is defined, then the OIDC provider uses the memory datastore as
fallback. This is only for testing purposes because the memory datastore offers
no persistency at all.

If you use an LDAP datastore, then you may want to install the OAUTH2/OIDC
schemata for having dedicated attributes for all OAuth2 and OIDC features.

You must run the datastores as separate services/containers on a network that
the oidc-provider container can reach. Alternatively, you may run the datastores
as separate systems, of course.

In order to configure node-oidc-provider easily, you should install
node-jose-tools from npm:

```
npm i -g node-jose-tools
```

### Configurations and Secrets

The configuration of node-oidc-provider can be split into separate configurations.

The core configuration needs to point the provider to the other configuration
files.

I recommend to split the configuration as following:

* The core configuration
* A connection configuration for each datastore service
* An integrity key store (for internal use)
* A certificate key store (for public use)
* A pairwiseSalt file

If LDAP datastores are used, then you should create a configuration for each
adapter that uses an LDAP datastore.

You should create the connection configuration, key stores, and the pairwiseSalt
as secrets, so private keys and passwords are encrypted.



# Running node-oidc-provider as a standalone container

You may want to run node-oidc-provider as a standalone container instead of a
service. In this case you must create a container image that contains the
configuration files, because for standalone containers you cannot pass the
configuration dynamically. 

Create a new project that contains a Dockerfile and the configurations.

Your Dockerfile should look as following.

```
FROM phish108/node-oidc-provider
COPY . /etc/oidc/
```

You can then run ```docker build .``` to build a container with a special
configuration.
