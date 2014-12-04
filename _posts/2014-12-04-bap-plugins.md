---
layout: post
permalink: bap_plugins
title: BAP Plugins
---

BAP 1.x has introduced a new plugin architecture to make the overall
platform more extensible.  The plugin architecture is motivated by two
competing goals. First, we want to reuse existing libraries within the
framework.  For example, why reinvent a new diassembler when there are
various existing ones that do a great job?  Second, we want to provide
a single interface to upstream analysis, e.g., a control flow graph
module shouldn't care whether the original executable came from an Elf
file, a PE file, or even a memory image.

The plugin architecture provides a light-weight and consistent
framework for integrating third party code. Since we check plugins
against well-defined interfaces, we can take advantage of the OCaml
strong type checking to make sure there are no unexpected
surprises. For example, a plugin for reading executable formats must
expose the ability to identify sections; you simply cannot forget to
include it and have the plugin type check.

A plugin is an OCaml library that is installed in the system in the
place, where `ocamlfind` tool can find it. The `META` file, that
describes the library should contain a string:

```
plugin_system = "bap.subsystem"
```

Where `subsystem` stands to a name of subsystem of BAP that you would
like to extend. For example, if you are adding new image backend, then
you need to plug it into the `image` module system:

```
plugin_system = "bap.image"
```

For example, if you are adding a new disassembler, then it should be a
`disasm`, like

```
plugin_system = "bap.disasm"
```

All plugins are loaded with `Plugins.load` command. When plugin is
loaded, all it code is evaluated. The actual registration of the
plugin service is specific to each subsystem. But usually it includes
some kind of registration, like calling `Image.register_backend` for
the plugins of `bap.image` system.

There are a few noteworthy points:
  1. `baptop` will automatically load plugins for you.

  2. `Plugins.load` function shouldn't be called from a `baptop`
    since, toplevels in OCaml have different linking rules.

  3. It is not possible to re-evaluate plugin after you have
     changed and reinstall it. The only way is to restart the program, or
     `baptop`.

  4. The Plugin system will check, that the plugin is compiled
     against the same interfaces as the main program. So, if you
     have updated and recompiled bap, or updated systems library
     that we're depend on, then make sure, that you also reinstall
     your plugins. Otherwise, they won't load.

If you're writing your own plugin, then we suggest you use the `oasis`
tool to generate all the necessary files and scripts. A minimum oasis
file would be:

```
OASISFormat: 0.4
Name:        bap
Version:     0.2
Synopsis:    BAP Core Library
Authors:     Plugin Writers
License:     MIT
Copyrights:  (C) 2014 Carnegie Mellon University
Plugins:     META (0.4), DevFiles (0.4)
BuildTools: ocamlbuild, camlp4o

Library elf_backend
  Path:            .
  FindlibName:     our_fancy_bap_plugin
  XMETAExtraLines: plugin_system = "bap.image"
  CompiledObject:  best
  BuildDepends:    bap
  Modules:         A, B, C
```

A detailed interface to plugin system is provided in
[`Plugin`](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap/bap_plugin.ml)
and
[`Plugins`](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap/bap_plugins.ml)
modules. For example, you can look at all available plugins with this
command (assuming that `Core_kernel.Std` is opened):

{% highlight ocaml %}
# Plugins.all () |> List.map ~f:Plugin.name;;
- : bytes list = ["bap.image.elf_backend"]
{% endhighlight %}
