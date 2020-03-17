#!/usr/bin/env sh

set -eu

TOKEN=$1

sync () {
    if [ -d $1 ]; then
        rsync -a --delete $1 $2
    fi
}

if [ -f bap_commit ]; then
    sync ready/man1/ bap/api/man1/
    sync ready/man3/ bap/api/man3/
    sync ready/odoc/ bap/api/odoc/
    sync ready/lisp/ bap/api/lisp/

    repo="https://${GITHUB_ACTOR}:${TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
    git config --global user.name $GITHUB_ACTOR
    git config --global user.email "action-noreply@github.com"

    git add .github/docs/bap-digest
    git add bap/api > /dev/null
    git commit -m `cat bap_commit`
    git push $repo master
fi
