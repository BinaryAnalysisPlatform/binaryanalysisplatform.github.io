---
layout: post
permalink: bap-tutorial-announce
title: The BAP Tutorial
---

It was a lasting issue that BAP didn't have a tutorial. We have an
extensive reference documentation that can even be considered as a
manual, we have wiki and chats, but still it was necessary to read
lots of stuff even for writing the simplest analysis. That's why
people kept asking us for the tutorial. So, today we are happy to
announce the first [true tutorial][1].

The target auditory of the tutorial is expected to be more or less
advanced, as the tutorial will cover not only the basics, but will
teach how to write your own analysis. The good news, is that the
tutorial is bilingual, i.e., if OCaml is not in your arsenal, you can
teach yourself using Python.

In the tutorial we will learn how to perform simple tasks with
binaries, like examining the IR or disassembly. And we will learn how
to extend BAP with new analysis. In our case, we will write a checker
that will verify that a particular sequence of calls may never happen
in a given program.

Please, feel free to add your comments or questions about the tutorial
on its [issue tracker][2].



[1]: https://github.com/BinaryAnalysisPlatform/bap-tutorial
[2]: https://github.com/BinaryAnalysisPlatform/bap-tutorial/issues
