#!/bin/bash

SLAPDTMPCONFIG=/tmp/slapd/tmp.conf

mkdir /tmp/slapd
mkdir /tmp/slapd/slapd.d
mkdir /tmp/slapd/schema

cp ../schema/*.schema /tmp/slapd/schema

ls /etc/ldap/slapd.d/cn=config/cn=schema | perl -pe 's/cn=\{\d+\}([^.]+)\..*/include \/etc\/ldap\/schema\/\1.schema/' > $SLAPDTMPCONFIG
ls ../schema/*.schema | perl -pe 's/^([^.]+\..*)$/include \/tmp\/slapd\/schema\/\1/' >> $SLAPDTMPCONFIG

slaptest -f $SLAPDTMPCONFIG -F /tmp/slapd/slapd.d

# now move all schema files to the official configuration
#
# This will preserve all preexisting schema files.
cp -n /tmp/slapd/slapd.d/cn=config/cn=schema/*.ldif /etc/ldap/slapd.d/cn=config/cn=schema

# remove the temporary directory again.
rm -rf /tmp/slapd
