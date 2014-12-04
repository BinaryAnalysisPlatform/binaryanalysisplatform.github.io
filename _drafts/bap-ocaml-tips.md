---
layout: post
title: BAP Conventions
---

In this blog post we will give several tips for using BAP on your system.



# Use baptop

BAP comes with a program called `baptop`, which is an excellent way to
explore BAP modules.  `baptop` is a
[`utop`](https://opam.ocaml.org/blog/about-utop/) interface that loads
the BAP.  `utop` provides a bunch of useful directives, that can help
you to explore BAP library interactively.  You can find the type of
any type, module or expression or in `baptop` by using the `#typeof`
directive followed by the name of the expression in quotes. For
example, to find the type of `Image.t`, in `baptop` type:

{% highlight ocaml  %}
(* using a fully-qualified name.  *)
utop # open Bap.Std;;
utop # #typeof "image";;
type Bap.Std.image = Bap.Std.Image.t
{% endhighlight %}


# Module hierarchy management

We have spent quite a bit of time thinking about the BAP module
hierarchy.  Inside BAP, all types and definitions are belong to a
`Bap.Std` module hierarchy.  The structure mimics OCaml `Core` library
quite closely.

Underneath the hood we use somewhat mangled names for actual files
that are not as clean as the compiled BAP hierarchy. The mangling is
to overcome some problems with linking and `ocamlfind` that posed a
challenge to preserving hierarchy purity. As a result, often the name
of a module (e.g.,
[`Elf`](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap_elf/bap_elf.ml))
does not correspond to a single file of the same name (e.g., there is
no elf.ml). A BAP developer will have to work their way through the
file redirection space, but no BAP user should have to.


# Setting up your editor



