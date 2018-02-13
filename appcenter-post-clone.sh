#!/usr/bin/env bash -e

brew install jq

# Only build the native binaries when we are on an annotated tag matching a semver string
# starting with a `v`
if [[ $APPCENTER_BRANCH == "master" ]] \
	|| [[ $APPCENTER_BRANCH == "beta" ]] \
	|| [[ $APPCENTER_BRANCH == "staging" ]]; then
	tag=$(git describe --exact-match HEAD)
	[[ $? -ne 0 ]] && exit 1
	# tag=v0.9.2
	[[ ! $tag =~ ^v[0-9]+\.[0-9]+ ]] && WANTS_OTA_BUILD=1
fi

if [[ -n "$WANTS_OTA_BUILD" ]]; then
  echo "watns OTA"
fi
