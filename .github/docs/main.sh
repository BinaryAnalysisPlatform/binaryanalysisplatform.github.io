#!/usr/bin/env sh

set -eu

digest=.github/docs/bap-digest

old=`cat $digest`
new=`curl -s https://hub.docker.com/v2/repositories/binaryanalysisplatform/bap/tags | jq -r '.results|.[]| select ( .name == "latest") | .images | .[] | .digest'`

if [ "get$old" != "get$new" ]; then
    echo $new > $digest
    git log --pretty=format:"%s" | head -n 1 > .github/docs/commit
    docker image build .github/docs -t docs
    mkdir ready

    bap=mycontainer:/home/opam/bap.master

    docker run -v `pwd`:/drive --name mycontainer docs
    docker cp    $bap/doc/lisp ready/
    docker cp    $bap/doc/man1 ready/
    docker cp    $bap/doc/man3 ready/
    docker cp -L $bap/doc/odoc ready/
    docker cp    $bap/bap_commit .
    docker container stop mycontainer
    docker container rm mycontainer
    docker image rm docs
else
    echo "The digest of bap:latest is the same, nothing to do"
fi
