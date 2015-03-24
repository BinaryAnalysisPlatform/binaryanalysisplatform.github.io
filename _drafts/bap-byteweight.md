---
layout: post
title: bap-byteweight: Find functions in stripped binaries
---

BAP 0.9.5 includes the `bap-byteweight` utility to identify function starts. The
main idea of ByteWeight is to
 - Learn features of function starts from a set of training binaries with symbol tables (for ground truth)
 - Identify functions from testing binaries, which may be stripped.
The ByteWeight algorithm is covered in
depth in our
[2014 USENIX Presentation](https://www.usenix.org/conference/usenixsecurity14/technical-sessions/presentation/bao).

ByteWeight consists of:
 - A classifier that takes in a binary, a ByteWeight trained model, and outputs
function start addresses.  We include a model trained over gcc-produced
executables.
 - An algorithm for learning a new model, e.g., if you want to extend ByteWeight to
recognize functions from other compilers.

ByteWeight consists of three commands: `update`, `symbols`, and `find`.

`bap-byteweight update` is to download and install latest signatures from BAP platform. For unstripped
binaries, one can get symbol information through symbol table by running:
`bap-byteweight symbols [test_bin]`

For stripped binaries, one can use the ByteWeight signatures to identify
function starts by running:
`bap-byteweight find [test_bin]`

In our experiments with 2,200 binaries in
[x86](https://github.com/BinaryAnalysisPlatform/x86-binaries) and
[x86-64](https://github.com/BinaryAnalysisPlatform/x86_64-binaries), we found that
ByteWeight has better accuracy than
[IDA Pro](https://www.hex-rays.com/products/ida/) in function start identification. In
our test, we measured:
 - False negatives. IDA missed 266,672 functions with respect to ground truth,
while ByteWeight missed 44,621 functions.
 - False positives. IDA misidentified 459,247 functions, while ByteWeight
misidentified 43,992 functions.

Of course your results may vary, but we believe the above is a reasonably strong
indicator ByteWeight performs well.  We also provide an evaluation command for
user to compare ByteWeight’s result against IDA Pro’s results using the command:

`bap-byteweight evaluation [test_bin]`

This command outputs the precision, recall, F_0.5 measurement for both
ByteWeight and IDA Pro.

For more detail, please check the manual of `bap-byteweight` by command
`bap-byteweight --help`.
