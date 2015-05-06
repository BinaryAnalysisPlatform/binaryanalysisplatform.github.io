---
layout: post
title: Bap-byteweight&#58; Find functions in stripped binaries
---


BAP 0.9.7 includes the `bap-byteweight` utility to identify function starts.
Function start information is useful for program analysis, and function
identification is a preliminary and necessary step in many binary analysis
techniques and applications. Function information is stored as the symbols in
symbol table, which resides in the header of a binary program. However, when the
binary is stripped, the symbol table will be removed, and thus such function
information needs to be recovered from the code itself.

ByteWeight is designed to address the function recovery program. The
key idea of ByteWeight is to learn features of function starts from a set of
training/unstripped binaries with symbol tables, and then to identify functions
from testing binaries which may be stripped.  The ByteWeight algorithm is
covered in depth in our [2014 USENIX
Paper](https://www.usenix.org/conference/usenixsecurity14/technical-sessions/presentation/bao).

ByteWeight consists of a classifier that outputs the function start addresses
given a binary and a trained signature. Moreover, ByteWeight provides the
classifier-training algorithm for user to train user's own classifier on his own
binary set. For instance, if one wants to extend ByteWeight to recognize
functions from other compilers, he can use the `bap-byteweight train` command.

BAP provides trained signatures for binaries in x86, x86-64 and arm which user can
utilize directly without training by themselves. To obtain these signatures,
user can use the `bap-byteweight update` command, which is to download and
install the latest signatures from BAP platform. For unstripped
binaries, one can get symbol information through symbol table by running:

`bap-byteweight symbols [test_bin]`

For stripped binaries, one can use the ByteWeight signatures to identify
function starts by running:

`bap-byteweight find [test_bin]`

We currently measure the functions start accuracy on 2,476 binaries in
[x86](https://github.com/BinaryAnalysisPlatform/x86-binaries),
[x86-64](https://github.com/BinaryAnalysisPlatform/x86_64-binaries) and
[arm](https://github.com/BinaryAnalysisPlatform/arm-binaries). We tested
ByteWeight and [IDA Pro](https://www.hex-rays.com/products/ida/) 6.7, and we
measured:

 - True Positives (TP), which are true functions and was identified by
     the tool correctly.
 - False Negatives (FN), which are missing functions that should have
     been identified by the tool.
 - False Positives (FP), which are false functions identified by the
     function start identification tool.

![tff]({{localhost}}/assets/bap-mbw-tff.png)

In the above test, IDA identified less true
functions than ByteWeight did, and IDA missed and mis-identified more functions
than ByteWeight in all three architectures.


We also measure the precision, recall and [F0.5
metrics](http://en.wikipedia.org/wiki/F1_score) in terms of the test suite in
three architectures. Precision is calculated by $$Precision=\frac{TP}{TP+FP}$$
which indicates the proportion of correct functions among all functions
identified by the tool. Recall is calculated by $$Recall = \frac{TP}{TP+FN}$$
which indicates the proportion of functions that the tool identified among all correct
functions. F0.5 is calculate by $$F_{0.5} = \frac{1.5 \cdot Precision \cdot
Recall}{0.5 \cdot Precision + Recall}$$ and is often used as a comprehensive
measurement combining precision and recall.

![fpr]({{localhost}}/assets/bap-mbw-fpr.png)

The precision, recall and F0.5 metrics for both ByteWeight and IDA for test
binaries in arm, x86 and x86-64 is shown in the above table. Based on the table,
ByteWeight has higher precision, recall and F0.5 measurement than IDA in all
three architectures.

Of course your results may vary, but we believe the above is a reasonably strong
indicator ByteWeight performs well.  We also provide an evaluation command for
user to compare ByteWeight’s result against IDA Pro’s results using the command:

`bap-fsi-benchmark [OPTION]… [tool] [binary] [ground-truth]`

This command outputs one or more metrics among true positive, false positive,
false negative, precision, recall and F0.5 in terms of the test binary. User
can use this command to evaluate either ByteWeight or IDA.

For more detail, please check the manual of `bap-fsi-benchmark` by command
`bap-fsi-benchmark --help`.
