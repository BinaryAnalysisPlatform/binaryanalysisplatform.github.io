---
layout: post
permalink: bap_executable_parsers
title: BAP Executable  Parsers
---

One of the fundamental tasks in binary analysis is parsing executable
formats on disk.  Popular executable formats include ELF (Linux),
Mach-O (OS X), and PE (Windows). In IDA Pro, this parsing is done by
what they call loaders.

When designing the BAP architecture, we had two goals:

1. Enable the use of existing and third-party parsing libraries.
2. Provide a unified front-end view and set of routines to downstream
   code that is agnostic to the particular parsing format.

Our approach to meeting these goals was to design a plugin
architecture. The plugin architecture consists of two logical pieces
of code:


1. A parser-specific backend plugin that presents a simplified view on
   data stored in a particular binary container. This representation
   is minimized and simplified, in order to make it easier to write
   plugins in languages other then OCaml. The representation is
   described in a
   [Image_backend](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap_image/image_backend.ml)
   module.

2. A frontend module
   [Image](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap_image/bap_image.ml)
   that provides access to the data in executable container formats
   while abstracting away the specific details of that
   container. Example functions include creating an `image` from a
   filename or data string, getting attributes such as the
   architecture and address size, etc. And, of course, it provides
   methods to access the actual data, like sections, symbols and
   memory.



**Opening up BAP.** In the rest of this article we go through the
plugin architecture using the OCaml-native ELF plugin as our running
example. We assume, that `Bap.Std` has been opened:

{% highlight ocaml  %}
$ baptop
<... utop initialization output ...>
utop # open Bap.Std;;
{% endhighlight %}

We will refer to all definitions using their short aliases. If it
is no stated otherwise, all types and definitions are belong to a
`Bap.Std` hierarchy.


## Backend Plugin

The ELF backend code's job is to abstract away the ELF and DWARF
specific details into a unified `image` type.  Our Elf backend plugin
is divided into two libraries:

 * `bap.elf` for parsing and converting Elf binaries to an executable
 format-agnostic data structure.

    * The `bap.elf` module in turn uses an Elf parser for most of the
      heavy lifting. The Elf parser is implemented in a
      [Elf](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap_elf/bap_elf.ml)
      module. [Elf.Types](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap_elf/elf_types.ml)
      submodule exposes a rich set of type definitions, and
      [Elf.Parse](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap_elf/elf_parse.ml)
      provides an interface to the parser proper. The parser is
      inspired from Jyun-Yan You's parser, but modified to avoid
      unnecessary copies of data for efficiency. As such, the parser
      does not typically return actual data, but offsets to queried
      data.  Of course you can always retrieve the data when needed
      using the utility functions `Elf.section_name` and
      `Elf.string_of_section`.


 * `bap.dwarf` that allows one to lookup dwarf symbols in a file. At
   the time of this writing, our elf parsing library doesn't support
   symtable reading.


## Frontend

The frontend provides an abstraction over executables formats, and is
agnostic to the particular backend. Thus, end users should not have to
change their code as new backends are added.

The frontend provides the
[Image](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap_image/bap_image.ml)
module, which provides functions and data structures such as finding
entry points (`Image.entry_point`), architecture (`Image.arch`), and
so on.  The `Image` module exposes two key types:
`Image.Sec.t` for sections, and `Image.Sym.t` for symbols. For each
type there are utilities for efficient comparison, iteration, building
hash tables, and so on.

## Creating and Using New Plugins

New plugins can be added by anyone, and need not be incorporated into
the BAP tree itself. Recall that
[BAP plugins]({{ post_url }}/bap_plugins) are found via the
`META` file, and are of the form:

```
plugin_system = "bap.subsystem"
```

In order to add a new executable image backend, you should attach your
plugin to the  `image` subystem, i.e.,:

```
plugin_system = "bap.image"
```


We recommend you do so by adding the above command as part of your
oasis build.  Please see our
[BAP plugin blog post]({{post_url}}/bap_plugins) on plugins for more information.

**Note:** We adhere to the principle functions in BAP do not
occasionally throw exceptions. Instead, if function can fail, then it
will specify it explicitly in its type, by returning a value of type
['a Or_error.t](https://blogs.janestreet.com/ocaml-core/110.01.00/doc/core_kernel/#Or_error),
that is described in their
[blog](https://blogs.janestreet.com/how-to-fail-introducing-or-error-dot-t/)
as well as in the Real World OCaml
[Chapter 7](https://realworldocaml.org/v1/en/html/error-handling.html). We
encourage you to follow this convention in your own plugins. 


## Summary

BAP provides a neat plugin architecture for adding new backends that
parse executable formats.  In order to support a new format, you
should write (or find an existing) parser, and then write a small
set of functions as a plugin that translate whatever the parser code
outputs into the BAP data structures.  Our plugin system allows third
parties to add plugins at any time without changing BAP.  The plugin
system also means end users do not have to change any of their code
when a new plugin is added.


One elephant in the room we did not address is why we do not simply
use BFD, as we did in previous versions of BAP.  One reason is BFD is
a large library, and therefore may be more than most people
need. While a large library may seem attractive at first blush (after
all, features!), remember that if you get the functionality, you also
get all the bugs, vulnerabilities, and support issues as well.  A
second reason is BFD is GPL, which would mean BAP is GPL if we
included it as a core component.  GPL poses a barrier for adoption in
some practical scenarios, which we wish to avoid.

Overall, by abstracting to a plugin architecture in this release of
BAP, we believe we hit a nice middle ground where people can use
whatever backends they want for parsing, while providing a useful set
of features to front-end users.
