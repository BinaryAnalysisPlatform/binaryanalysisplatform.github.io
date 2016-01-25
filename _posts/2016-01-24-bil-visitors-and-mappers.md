---
layout: post
permalink: bil-visitor-mappers
title: BIL Visitors and Mappers
---

During disassembly, BAP lifts native binary instructions to a
language-agnostic, intermediate representation: the BAP intermediate Language
(BIL). In this post we look specifically at traversing and transforming BIL
using BAP's API. Lifted BIL code is represented as an AST data structure that
can be traversed and transformed for the purposes of analysis.

BAP provides a plethora of method hooks for traversing BIL ASTs according to
the visitor design pattern. OCaml's object-oriented features allow us to
realize these visitor patterns in an elegant and powerful way; however, for the
unfamiliar, usage tends to be harder to grasp. This post serves to
provide self-contained, explanatory examples that eases the introduction to the
BIL visitor and mapper capabilities.

A full template is provided for each example at the end of this post--it may be
used with the same `example` binary from previous posts.

## Visitors

#### A simple visitor

> How do I use a BIL visitor to print BIL statements?

The following snippet accepts a list of `bil_stmts` and simply visits each
statement in the list, printing it.

```ocaml
let visit_each_stmt bil_stmts =
  (object inherit [unit] Bil.visitor
    method! enter_stmt stmt state =
      Format.printf "Visiting %s\n" (Stmt.to_string stmt)
    end)#run bil_stmts ()
```

Output:

```
Visiting t_113 := RBP
Visiting RSP := RSP - 0x8:64
Visiting mem64 := mem64 with [RSP, el]:u64 <- t_113
...
```

Notes:

* We inherit the `Bil.visitor` class, which defines and provides our visitor
callback hooks.
* We make use of the `enter_stmt` callback. There are [many such
callbacks](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap/bap.mli#L2048),
for each language construct for BIL.
* `[unit]` indicates the type of the state that we are passing along in our
visitor; here, every time we enter a statement. This corresponds with the
variable `state` for `enter_stmt` which we override.
* The `#run` invocation operates over a `stmt list` by default.
* We pass unit `()` as the initial state.
* The return type of enter_stmt is that of our state: `unit`.

<hr>

#### A visitor with state

> How do I collect all the the jump (direct) targets in a list of BIL statements?

```ocaml
let collect_jumps bil_stmts =
  (object inherit [Word.t list] Bil.visitor
    method! enter_int x state = if in_jmp then x :: state else state
  end)#run bil_stmts []
```

Output (if we print the result):

```
Jmp: 0x40056E:64
```

Notes:

* This time, the visitor uses a `Word.t list` as user-supplied state which
stores jump targets.
* Our callback triggers every time we enter an int; essentially, a constant.
* We determine that this constant is a jump target with the `in_jmp` predicate:
this state is implicitly included with each visit. See the [class
state](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap/bap.mli#L1982)
in the API for other information passed along visits.
* Instead of `in_jmp`, we could of course have used a different hook: the
provided
[enter_jmp](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap/bap.mli#L2058)
callback.

<hr>

## Mappers

#### A simple mapper

> How do I use a BIL mapper to transform BIL code?

Our previous visitor inherited the BIL `class 'a visitor`, where `'a` was our
inherited user-supplied state. But there's also `class mapper`. `class mapper`
doesn't carry any user-supplied state with it. With mapper, you can transform
the BIL statements and expressions in the AST.

Let's transform binary operations with some constant offset to an offset of `0x41`. For instance:

```
RSP := RSP - 0x8:64
```

becomes

```
RSP := RSP - 0x41:64
```

Specifically, if we encounter the binary operator `+` or `-`, and its second
operand is a constant, we rewrite the constant to be `0x41`.

```ocaml
let offset_41_mapper bil_stmts =
  (object inherit Bil.mapper
    method! map_binop operator operand1 operand2 =
      match operator,operand2 with
      | Bil.PLUS,Bil.Int offset
      | Bil.MINUS,Bil.Int offset ->
        let new_operand2 = Bil.int (Word.of_int ~width:64 0x41) in
        Bil.binop operator operand1 new_operand2
      | _ -> Bil.binop operator operand1 operand2
  end)#run bil_stmts in
```

Output:
```
t_113 := RBP
RSP := RSP - 0x41:64
mem64 := mem64 with [RSP, el]:u64 <- t_113
```

Notes:

* We inherit `Bil.mapper`.
* We use `map_binop` instead of `enter_binop`.
* We pattern-match against the BIL operators `PLUS` and `MINUS`, and pattern
match the second operand against `Bil.Int`: if it matches, we rewrite the
second operand and construct a new `Bil.binop` expression.
* If we reach the `_` case for pattern matching, nothing changes: we
reconstruct the original expression using the same operator and operands.
* No user-state is passed a long. The return type for each expression is `exp`.

<hr>

## Customization

#### A custom visitor

> What is a custom visitor and how can I make one?

We can create our own subclassing visitor, i.e., we don't have to use class 'a visitor or class mapper. For instance, we can pass our own implicit state a long with a custom visitor (and still allow anyone else to define a user-supplied state variable). Here's some quick syntax for defining your own visitor:

```ocaml
class ['a] custom_visitor = object
   inherit ['a * int list] Bil.visitor
end
```
Let's define a `custom_visit` function:

```ocaml
let custom_visit bil_stmts =
  (object inherit [string] custom_visitor
    method! enter_stmt stmt state =
      Format.printf "Visiting %s\n" (Stmt.to_string stmt);
      ("still-user-defined",[3;2;1])
  end)#run bil_stmts ("user-defined",[1;2;3])
```

Output:

```
Visiting t_113 := RBP
Visiting RSP := RSP - 0x8:64
Visiting mem64 := mem64 with [RSP, el]:u64 <- t_113
```

Notes:

* Our visitor inherits only the type of our _user-defined_ state: a string.
* However, the inherited `state` variable in `enter_stmt` has type `string *
int list`: the type defined in our `custom_visitor` class.
* The `int list` is passed along any visitor we create using `custom_vistor`.
This is useful if the `int list` state is changed by another function as we
fold over BIL (for instance, for tracking depth in the AST, we might create a
`depth_visitor` that maintains a depth of the current traversal, without the
user having to define their own variable for doing so).

<hr>

## Wrap-up

This post highlighted some basics of BIL visitor and mapper functionality, but
there is a lot more to discover. For example, here are further extensions that
are possible within the visitor framework:

* Our examples used only a single callback method; of course, we can have
multiple visit methods inside our visitor object.
* Our examples have all invoked the traversal with `#run`. However, we can in
fact visit any particular part of the BIL AST by replacing `#run` in previous
examples with
[#enter_stmt](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap/bap.mli#L2048),
[#enter_exp](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap/bap.mli#L2083),
[#enter_binop](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap/bap.mli#L2098),
and so on: the only condition is that we supply these visits with the correct
type. So, where `#run` accepts a `stmt list`, `enter_exp` expects an `exp`.
* Our examples made use of `enter_...` visitors. However, every language
construct also has additional `visit_...` and `leave_...` directives,
depending on the need.
* There are a host of [BIL
iterators](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap/bap.mli#L2226)
that can be used in all sorts of imaginative ways: We can iterate, map, fold
(and many more!) over BIL statements. For example, we can supply `Bil.fold`
with a visitor object which is run over the AST with our own `init` state.
* Many interesting BIL transformers exist, for example, a [constant
folder](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap/bap.mli#L2316)
and [expression
substituter](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap/bap.mli#L2299).
* Have a look at the
[finder](https://github.com/BinaryAnalysisPlatform/bap/blob/master/lib/bap/bap.mli#L2149)
if you want a BIL visitor that searches for specific patterns in the AST.

<hr>

## Examples template

#### Visitor and mapper examples template

```ocaml
#use "topfind";;
#require "bap.top";;
open Core_kernel.Std
open Bap.Std
open Or_error

let main () =
  Project.from_file Sys.argv.(1) >>= fun project ->

  let normalize = String.filter ~f:(function
      | '\t' | '{' | '}' -> false
      | _ -> true) in

  let syms = Project.symbols project in
  let main_fn = match Symtab.find_by_name syms "main" with
    | Some fn -> fn
    | None -> failwith "Could not find function main in symbol table"
  in
  let entry_block = Symtab.entry_of_fn main_fn in
  let block_insns = Block.insns entry_block in

  (* visit_each_stmt *)
  let visit_each_stmt bil_stmts =
    (object inherit [unit] Bil.visitor
      method! enter_stmt stmt state =
        Format.printf "Visiting %s\n" (Stmt.to_string stmt)
    end)#run bil_stmts ()
  in

  List.iter block_insns ~f:(fun (_,insn) ->
      let bil = Insn.bil insn in
      visit_each_stmt bil);

  (* collect_jumps *)
  let collect_jumps bil_stmts =
    (object inherit [Word.t list] Bil.visitor
      method! enter_int x state = if in_jmp then x :: state else state
    end)#run bil_stmts []
  in

  List.iter block_insns ~f:(fun (_,insn) ->
      let bil = Insn.bil insn in
      collect_jumps bil |> List.iter
        ~f:(fun word -> Format.printf "Jmp: %a\n" Word.pp word));

  (* offset_41_mapper *)
  let offset_41_mapper bil_stmts =
    (object inherit Bil.mapper
      method! map_binop operator operand1 operand2 =
        match operator,operand2 with
        | Bil.PLUS,Bil.Int offset
        | Bil.MINUS,Bil.Int offset ->
          let new_operand2 = Bil.int (Word.of_int ~width:64 0x41) in
          Bil.binop operator operand1 new_operand2
        | _ -> Bil.binop operator operand1 operand2
    end)#run bil_stmts in

  List.iter block_insns ~f:(fun (_,insn) ->
      let bil = Insn.bil insn in
      let new_bil =
        offset_41_mapper bil in
      Format.printf "41-Bil: %s\n" (Bil.to_string new_bil |> normalize));

  return ()

  let () =
    try main ()
        |> function
        | Ok o -> ()
        | Error e -> Format.printf "BAP error: %s\n" @@ Error.to_string_hum e
    with
    | Invalid_argument _ ->
      Format.printf "Please specify a file on the command line\n"
```

#### Custom visitor template

```ocaml
#use "topfind";;
#require "bap.top";;
open Core_kernel.Std
open Bap.Std
open Or_error

(* custom_visitor *)
class ['a] custom_visitor = object
   inherit ['a * int list] Bil.visitor
end

let main () =
  Project.from_file Sys.argv.(1) >>= fun project ->

  (* custom_visit *)
  let custom_visit bil_stmts =
    (object inherit [string] custom_visitor
      method! enter_stmt stmt state =
        Format.printf "Visiting %s\n" (Stmt.to_string stmt);
        ("still-user-defined",[3;2;1])
    end)#run bil_stmts ("user-defined",[1;2;3])
  in

  let syms = Project.symbols project in
  let main_fn = match Symtab.find_by_name syms "main" with
    | Some fn -> fn
    | None -> failwith "Could not find function main in symbol table"
  in
  let entry_block = Symtab.entry_of_fn main_fn in
  let block_insns = Block.insns entry_block in

  List.iter block_insns ~f:(fun (mem,insn) ->
      let bil = Insn.bil insn in
      custom_visit bil |> Pervasives.ignore);

  return ()

  let () =
    try main ()
        |> function
        | Ok o -> ()
        | Error e -> Format.printf "BAP error: %s\n" @@ Error.to_string_hum e
    with
    | Invalid_argument _ ->
      Format.printf "Please specify a file on the command line\n"
```
