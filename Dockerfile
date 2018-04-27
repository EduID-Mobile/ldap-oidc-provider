# use the slime line alpine rather than LTS carbon
FROM node:alpine as builder

RUN apk add --no-cache --virtual buildtools git make gcc g++ python

# Create the app directory
WORKDIR /oidc-provider

# the oidc provider expects all configurations in /etc/oidc/*
# the standalone version may override this configuration, which is not the
# case for docker containers.

# Install app dependencies
COPY package*.json ./

# load dependencies for production only
RUN npm install --production

FROM node:alpine

# Create the app directory
WORKDIR /oidc-provider

# create configuration directory
RUN mkdir -p /etc/oidc

# get the node modules
COPY --from=builder /oidc-provider .
# Bundle the app source
COPY . .

# the internal default port
# NOTE: the exposed port MUST be linked to a SSL termination!
Expose 3000

# launch our app
CMD ["npm", "start"]
