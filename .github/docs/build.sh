#!/usr/bin/env sh

set -eu

io_commit=/home/opam/commit

eval $(opam env)
ls -l

if [ -f $io_commit ]; then
    bap="bap.master"
    git clone https://github.com/BinaryAnalysisPlatform/bap --single-branch --branch=master --depth=1 $bap
    cd $bap
    bap_commit=`git rev-parse --short HEAD`

    if [ "$io_commit" != "$bap_commit" ]; then
        make doc
        ls doc
        echo $bap_commit > bap_commit
    else
        echo "Nothing we need to do, documentation is up-to-date"
    fi
else
    echo "Can't find a file with last binaryanalysisplatform.github.io commit"
    exit 1
fi
