---
layout: post
title: Why ocaml?
permalink: why_ocaml
---

BAP is written in OCaml, and I often get asked why. Often the person
asking has good reasons to prefer another language.  For example,
Python has more libraries and is quicker to prototype, C is faster,
and so on.

We do not take this question lightly. BAP has undergone several
significant rewrites, and for the last three iterations we have chosen
OCaml.  To understand why, first a little history

## Compilers at CMU

In the mid 2000's I (David Brumley) was a TA for the CMU undergraduate
compiler course (course number: 15-411). Peter Lee was the instructor.
(Peter is a former CMU Computer Science Departmet Head, now a Vice
President at Microsoft, and one of the co-inventors of Proof Carrying
Code.)  We use the excellent Appel book for compilers, which comes in
three forms: one for C, one for Java, and one for SML.

At the beginning of semester Peter told all the students that in his
experience, final grades historically roughly corresponded to the
language chosen. He also emphasized it didn't matter what language you
were familiar with now: he had seen many people who had never used ML
before write the course compiler in SML, and do quite well.

At the end of the semester, Peter's observations seemed quite
true. Students who programmed in C received a C or lower (often
fighting with hard-to-debug memory management issues that lead to
crashing compilers), students in Java received a B (lots of template
code, unexpected NULL exceptions), and students who wrote in ML got
As.  I do not remember whether this was true in every case, but it was
certainly a strong enough sign that I remember it.

## OCaml for Binary Analysis

As a graduate student, I worked with Dawn Song and created Vine, the
static analysis part of [BitBlaze](http://bitblaze.eecs.berkeley.edu).
That architecture underwent 3 main revisions. The first was in C, then
C++, and then OCaml. Just like in compilers, I found C memory safety
was hard to get right, my C++ relied on a huge amount of template code
(we tried using the visitor design pattern as specified in the Appel
compiler book), while OCaml seemed to be a sweet spot.

### Win: Static Type Safety

Others have spoken at length at the benefit of type safety.


Type safety is a big deal, not just for correctness but also because
it makes programs easier to debug.  

### Win: Pattern Matching
Beyond the well-discussed benefits of type safety covered elsewhere
(Hello [Jane Street](http://janestreet.com)), the ability to
**pattern match** ended up being a huge advantage.

Compilers, and most binary analysis platforms, desugar assembly
statements into an intermediate representation (IR).  The majority of
code analysis is a pattern match on IR statements. For example, in
def-use analysis you first match on assignment statements, and then
set anything on the left-hand side as a definition and on the
right-hand side as a use.  Pattern matching rules.
