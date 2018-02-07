#!/usr/bin/env bash

# echo $APPCENTER_REACTNATIVE_PACKAGE
# package.json

# echo $APPCENTER_SOURCE_DIRECTORY
# /Users/vsts/agent/2.127.0/work/1/s

# ls $APPCENTER_SOURCE_DIRECTORY
# ...
# dummy-sourcemap-main.jsbundle
# dummy-sourcemap-main.jsbundle.meta
# index.ios.map
# ...

# echo $APPCENTER_OUTPUT_DIRECTORY
# /Users/vsts/agent/2.127.0/work/1/a/build

# ls $APPCENTER_OUTPUT_DIRECTORY
# buildtest.xcarchive

## Upload dSYM files to BugSnag
find $APPCENTER_OUTPUT_DIRECTORY -type d -iname "*.xcarchive" -print0 | while IFS= read -r -d $'\0' xcarchiveDir; do
	./bin/bugsnag-dsym-upload "${xcarchiveDir}/dSYMs"
done

## Upload React Native bundle sourcemaps to BugSnag
# Examples
#   $ bugsnag-sourcemaps upload \
#       --api-key f915102cdb8153ee934b8549c930aa1b \
#       --app-version 1.0.0 \
#       --minified-url https://cdn.example.com/dist/bundle.js \
#       --source-map dist/bundle.js.map \
#       --minified-file dist/bundle.js
#   OR
#   $ bugsnag-sourcemaps upload \
#       --api-key f915102cdb8153ee934b8549c930aa1b \
#       --code-bundle-id 1.0-123 \
#       --minified-url main.jsbundle \
#       --source-map dist/main.jsbundle.map \
#       --minified-file dist/main.jsbundle \
#       --upload-sources

[ -z "$BUGSNAG_API_KEY" ] && echo "You must set a BUGSNAG_API_KEY" && exit 1

if [ -n "$APPCENTER_XCODE_PROJECT" ]; then
	bundleName=dummy-sourcemap-main.jsbundle
else
	bundleName=index.android.bundle
fi
bundleLocation="${APPCENTER_SOURCE_DIRECTORY}/${bundleName}"
sourceMapLocation="$APPCENTER_SOURCE_DIRECTORY/${bundleName}.map"

yarn run bugsnag-sourcemaps upload \
	--api-key $BUGSNAG_API_KEY \
	--app-version 1.0.0 \
	--source-map $sourceMapLocation \
	--minified-file $bundleLocation \
	--minified-url $bundleName \
	--upload-sources
