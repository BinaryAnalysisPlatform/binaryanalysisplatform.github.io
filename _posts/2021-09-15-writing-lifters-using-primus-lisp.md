# Defining instructions semantics using Primus Lisp (Tutorial)

## Introduction

So you found a machine instruction that is not handled by [BAP][12] and you wonder how to add it to BAP. This is the tutorial that will gently guide you through the whole process of discovering the instruction, studying its semantics, encoding it, testing, and finally submitting to BAP. The latter is optional but highly appreciated.

In modern BAP, the easiest option is to use [Primus Lisp][1] to define new instructions. The idea is that for each instruction, you describe its effects using Primus Lisp. No recompilation or OCaml coding is required. For example here is the semantics of the `tst` instruction in the thumb mode taken from BAP,

```lisp
(defun tTST (rn rm _ _)
  "tst rn, rm"
  (let ((rd (logand rn rm)))
    (set ZF (is-zero rd))
    (set NF (msb rd))))
```

You now probably have the question: what is `tTST` and why it has four parameters? We use LLVM (and now Ghidra) as the disassembler backend and when we write a lifter (i.e., when we define the semantics of instructions) we rely on the representation of instructions that are provided by the backend. In LLVM it is MC Instructions, which more or less corresponds to LLVM [MIR][2].


## Picking an instruction

So let's find some ARM instruction that is not yet handled by BAP and use it as a working example. The bap mc command is an ideal companion in writing lifters (mc - stands for machine code), as it lets you work with individual instructions. Besides, I wasn't able to find any ARM instruction that we do not handle (except co-processors instructions, which are not interesting from the didactic perspective) so we will be working with the thumb2 instruction set. So first of all, we need a binary encoding for the instruction that we would like to lift. If you don't have one then use llvm-mc (or any other assembler). The encoding (which I found from some wild-caught arm binary is 2d e9 f8 43 and we can disassemble it using bap mc

```
$ bap mc --arch=thumb --show-insn=asm -- 2d e9 f8 43
push.w {r3, r4, r5, r6, r7, r8, r9, lr}
```

Or, if we want to go the other way around, from assembly to binary encoding then here is the llvm-mc command-line,

```
$ echo "push.w {r3, r4, r5, r6, r7, r8, r9, lr}" | llvm-mc -triple=thumb -mattr=thumb2 --show-inst -show-encoding
    .text
    push.w    {r3, r4, r5, r6, r7, r8, r9, lr} @ encoding: [0x2d,0xe9,0xf8,0x43]
                                        @ <MCInst #4118 t2STMDB_UPD
                                        @  <MCOperand Reg:15>
                                        @  <MCOperand Reg:15>
                                        @  <MCOperand Imm:14>
                                        @  <MCOperand Reg:0>
                                        @  <MCOperand Reg:75>
                                        @  <MCOperand Reg:76>
                                        @  <MCOperand Reg:77>
                                        @  <MCOperand Reg:78>
                                        @  <MCOperand Reg:79>
                                        @  <MCOperand Reg:80>
                                        @  <MCOperand Reg:81>
                                        @  <MCOperand Reg:13>>
```

Now we need to get full information about the instruction name. In BAP, all instruction names are packaged in namespaces to enable multiple backends. To get full information about the instruction encoding and decoding we will use the --show-knowledge option of bap mc. This command-line option will instruct BAP to dump the whole knowledge base, so it will have everything that bap knows so far about the instruction. The property that we're looking for, is `bap:lisp-name` and `bap:insn`. The first will give us the true name and the last will show us how the instruction and operands are represented, e.g.,

```
$ bap mc --arch=thumb --show-knowledge -- 2d e9 f8 43 | grep lisp-name
   (bap:lisp-name (llvm-thumb:t2STMDB_UPD))
$ bap mc --arch=thumb --show-knowledge -- 2d e9 f8 43 | grep bap:insn
   (bap:insn ((t2STMDB_UPD SP SP 0xe Nil R3 R4 R5 R6 R7 R8 R9 LR)))
```

## Writing the stub semantics

Okay, now we have nearly all the knowledge so we can start writing the semantics. Let's start with some stub semantics, we will later look into the instruction set manual and learn the instruction semantics, but we want to make sure that BAP loads our files and calls our semantics function.

BAP searches for the semantics file in a number of predefined locations (see bap --help and search for --primus-lisp-semantics option for more details). The default locations include you $HOME/.local/share/bap/primus/semantics and the system-wide location that is usually dependent on your installation (usually it is in an opam switch in <opam-switch>/share/bap/primus/semantics. So you can either place your file in the home location or just pick an arbitrary location and tell bap where to search for it using --bap-primus-semantics=<dir>. In our example, we use the current folder (denoted with . in Unix systems) where we create a file named extra-thumb2.lisp (the name of the file doesn't really matter for the purposes of example, as long as it has the .lisp extension).

Now, we can create the stub definition of the instruction,
```
$ cat extra-thumb2.lisp
(defun llvm-thumb:t2STMDB_UPD (_ _ _ _ _ _ _ _ _ _ _ _)
  (msg "yay, it works"))
```
and let's check that bap properly dispatches the semantics,
```
$ bap mc --arch=thumb --primus-lisp-semantics=. --show-bil -- 2d e9 f8 43
yay, it works
{

}
```


## Learning the instruction semantics

So what does this series of `_ _ _ _ ...` mean? We see that bap applies `t2STMDB_UPD` as

```
bap mc --arch=thumb --show-knowledge -- 2d e9 f8 43 | grep bap:insn
   (bap:insn ((t2STMDB_UPD SP SP 0xe Nil R3 R4 R5 R6 R7 R8 R9 LR)))
```

So it has 12 operands. We haven't yet learned their semantics so we just ignored them. In Primus Lisp, like in OCaml, you can use the wildcard character as the argument name, if you're not using it. Now it is time to figure out what do they mean. The encoding of the llvm machine instruction is defined in the LLVM [target description (*.td)][3] files, which we can find in the LLVLM GitHub repository, namely, we [can learn][4],
```
// PUSH/POP aliases for STM/LDM
def : t2InstAlias<"push${p}.w $regs", (t2STMDB_UPD SP, pred:$p, reglist:$regs)>;
```
So now we know that `push.w regs` is an alias (syntactic sugar) to `stmdb sp!, {r3, r4, r5, r6, r7, r8, r9, lr}` (or even `stmdb sp!, {r3-r9, lr`}. Let's check that our gues is correct using `llvm-mc`,
```
$ echo 'stmdb sp!, {r3-r9, lr}' | llvm-mc -triple=thumb -mattr=thumb2 -show-encoding
    .text
    push.w    {r3, r4, r5, r6, r7, r8, r9, lr} @ encoding: [0x2d,0xe9,0xf8,0x43]
```

Indeed, the encoding is the same. So now it is time to download an [instruction reference][5] and look for the `stm` instruction. It is on page 357 of the pdf version, in section c2.141, and it says that instruction stores multiple registers. The `db` suffix is the addressing mode that instructs us to Decrement the address Before each store operation. And the `!` suffix (encoded as `_UPD` in llvm) prescribes us to store the final address back to the destination register. This is a high-level reference intended for `asm` programmers, so if we need more details with the precisely described semantics we can also look into the [ARM Architecture Reference Manual][6] (the [pdf file][7]). Here is the semantics obtained from this reference, which is described in the ARM pseudocode,

![arm pseudocode](https://files.gitter.im/552697e015522ed4b3dec2a1/YxnQ/2021-09-13-133357_455x249_scrot.png)

(I had to screen-shot it, as the indentation matters in their pseudo-code but it could not be copied properly from the pdf file).

## Learning Primus Lisp

So we're now ready to write some lisp code. You may have already skimmed through the [Primus Lisp documentation][8] that describes the syntax and semantics of the language. If you didn't don't worry (but it is still advised to do this eventually). Primus Lisp is a Lisp dialect that looks much like Common Lisp. Since it is Lisp, it has a very simple syntax - everything is an s-expression, i.e., either an atom, e.g., 1, 'hello, r0, or an application of a name to a list of arguments, e.g., (malloc 100) or (malloc (sizeof ptr_t)). The semantics of Primus Lisp is very simple as well. Basically, Primus Lisp is a universal syntax for assemblers. There is no other data type than bitvectors. From the perspective of the type system we distinguish bitvectors by their sizes, e.g., 0x1:1 is a one-bitvector with the only bit set to 1 and 0x1:16 is a 16-bitvector which has different size and different value and is a 16-bit word with the lower bit set to 1. All operations evaluate to words and accept words. Now what operations you can use? We can use BAP to get the up-to-date documentation for Primus Lisp. For this we will use the primus-lisp-documentation command (we need to pass the --semantics option as we have two interperters for Primus Lips, one for dynamic execution and another for static execution, which have different libraries and slightly different set of primitives),
```
bap primus-lisp-documentation --semantics > semantics.org
```

This command will generate the API documentation in the emacs org-mode. If you don't want to use Emacs to read this file then you can use `pandoc` to transform it to any format you like, e.g.,

```
pandoc semantics.org -o semantics.pdf
```

That will generate the [following document][9].

## Encoding semantics (the first attempt)

Now, after we skimmed through the documentation, let's make our first ugly (and may be incorrect) attempt to describe the semantics of the instruction,

```lisp
(defun llvm-thumb:t2STMDB_UPD (dst base _pred _? r1 r2 r3 r4 r5 r6 r7 r8)
  (let ((len 8)
        (stride (sizeof word-width))
        (ptr (- base (* len stride))))
    (store-word (+ ptr (* stride 0)) r1)
    (store-word (+ ptr (* stride 1)) r2)
    (store-word (+ ptr (* stride 2)) r3)
    (store-word (+ ptr (* stride 3)) r4)
    (store-word (+ ptr (* stride 4)) r5)
    (store-word (+ ptr (* stride 5)) r6)
    (store-word (+ ptr (* stride 6)) r7)
    (store-word (+ ptr (* stride 7)) r8)
    (set$ dst ptr)))
```

and before getting into the details, let's see how bap translates this semantics to BIL,
```
$ bap mc --arch=thumb --primus-lisp-semantics=. --show-bil -- 2d e9 f8 43
{
  #3 := SP - 0x20
  mem := mem with [#3, el]:u32 <- R3
  mem := mem with [#3 + 4, el]:u32 <- R4
  mem := mem with [#3 + 8, el]:u32 <- R5
  mem := mem with [#3 + 0xC, el]:u32 <- R6
  mem := mem with [#3 + 0x10, el]:u32 <- R7
  mem := mem with [#3 + 0x14, el]:u32 <- R8
  mem := mem with [#3 + 0x18, el]:u32 <- R9
  mem := mem with [#3 + 0x1C, el]:u32 <- LR
  SP := #3
}
```
The result looks good and, maybe even correct, but let's explore the lisp code.

The first thing to notice is that instead of using `_ _ ...` placeholders we gave each parameter a name. The first parameter is the destination register (it is the llvm rule that all functions that update a register have this register as the first parameter), then we have the base register (in our working example the destination and the base register are the same). Next, we have the _pred which we currently ignore, but will return later. We use the _ prefix to indicate that it is unused. Then there is an operand of unknown purpose, which we denoted as `_?` (I usually just blank them with `_`, but this is to show that lisp allows you to use any non-whitespace characters in the identifier). Finally, we have `r1` til `r8`, which binds the passed registers. Here, `r1` denotes not the register `r1` of ARM but the first register passed to the function, i.e., `r3` in our example. (It is to show that you can pick any names for your parameters and that they can even shadow the globally defined target-specific register names, which is probably a bad idea from the readability perspective, choosing something like `xN` would be probably a better idea).

Now it is time to look into the body of the function. First of all, we used `(let (<bindings>) <body>)` construct to bind several variables. Each binding has the form `(<varN> <exprN>)` and it evaluates `<exprN>` and binds its value to `<varN>` and make it available for expressions `<exprN+1>` and in the `<body>`, e.g., in the full form,

```lisp
(let ((<var1> <expr1>)
      (<var2> <expr2>)
      ....
      (<varN> <exprN>))
   <body>)
```

we can use `<var1>` in `<expr2>, ..., <exprN>`, and in the `<body>`, i.e., this is the lexical scope of `<var1>`. Once the let expression is evaluated `<var1>` becomes unbound (or bound to whatever it was bound before. In other words, normal lexical scoping, which is totally equivalent to the OCaml,
```ocaml
let var1 = expr1 in
let var2 = expr2 in
...
let varN = exprN in
body
```

The let-bound variables are reified into temporary variables in BIL. You may also notice that Primus Lisp Semantic compiler is clever enough and removed the constants. Let's go through the variables.

The first variable is `len` is a constant equal to `8`, which is the number of registers passed to the function. Unfortunately, llvm encodes the 15 registers not with a bitset (as it is actually represented in the instruction) but as a list of operands. So instead of writing one function, we will need to write 15 overloads per each number of registers in the list.

The next variable is also a constant, but we use a complex expression to describe it, `(sizeof word-width)`. The Primus Lisp Semantics Compiler is a meta-interpreter and it computes all values that are known in the static time. As a result, we don't see this constant in the reified code.

## Unleashing the macro power

Now let's deal with the body. It goes without saying that it is ugly. We have to manually unfold the loop since we don't have a program variable that denotes the set of registers that we have to store, but instead, llvm represents this instruction as a set of 15 overloads. BAP Primus Lisp supports overloads as well, but we definitely won't like to write 15 overloads with repetitive code, it is tedious, error-prone, and insults us as programmers.

Here comes the macro system. Primus Lisp employs a very simple macro system based on term rewriting. For each application `(foo x y z)` the parser looks for a definition of macro foo that has the matching number of parameters. If an exact match is found then `(foo x y z)` is rewritten with the body of the match. Otherwise, a match with the largest number of parameters is selected and the excess arguments are bound to the last parameter, e.g., if we have

```lisp
(defmacro foo (x xs) ...)
```

then it will be called with `x` bound to `a` and `xs` bound to `(b c)` if applied as `(foo a b c)`, where `a`, `b`, `c` could be arbitrary s-expressions.

The body of the macro may reference itself, i.e., it could be recursive. To illustrate it let's write the simplest recursive macro that will compute the length of the list,
```lisp
(defmacro length (r) 1)
(defmacro length (_ rs) (+ 1 (length rs)))
```
and now we can check that it works by adding

```lisp
(msg "we have $0 registers" (length r1 r2 r3 r4 r5 r6 r7 r8))
```

to the body of our definition. It will print,
```
we have 0x8 registers
```

Note that macros do not perform any compuations on bitvectors, unlike the Primus meta compiler. The macro engine operates on s-expressions, and `(length r1 r2 r3 r4 r5 r6 r7 r8)` is rewritten `(+ 1 (+ 1 (+ 1 (+ 1 (+ 1 (+ 1 (+ 1 1)))))))` on the syntatic level and is later reduced by the Primus Meta Compiler into `8`.

To solidify the knowledge and to move forward let's write a macro `store-registers` that will take an arbitrary number of registers, e.g., `(store-registers base stride off r1 r2 r3 .... rm)` which will unfold to a sequence of stores, where each register `rN` is stored as `(store-word (+ base (* stride N)) rN)`.

First, let's define the base case of our recursion,
```ocaml
(defmacro store-registers (base stride off reg)
  (store-word (+ base (* stride off)) reg))
```
and now the recursive case,
```lisp
(defmacro store-registers (base stride off reg regs)
  (prog
     (store-registers base stride off reg)
     (store-registers base stride (+ off 1) regs)))
```
Notice, that the body of the macro must be a single s-expression. There is no so-called *implicit body* and if we need to chain two expressions we have to explicitly use the `prog` construct. This construct has a very simple semantics, `(prog s1 s2 ... sN)` means evaluate `s1`, then `s2`, and so on until `sN` and make the result of the whole form equal to the result of the evaluation of the last expression.

And a better representation of the body will be,

```lisp
(defun llvm-thumb:t2STMDB_UPD (dst base _pred _? r1 r2 r3 r4 r5 r6 r7 r8)
  (let ((len 8)
        (stride (sizeof word-width))
        (ptr (- base (* len stride))))
    (store-registers ptr stride 0 r1 r2 r3 r4 r5 r6 r7 r8)
    (set$ dst ptr)))
```

And let's double-check that we still have the same reification to BIL with

```
$ bap mc --arch=thumb --primus-lisp-semantics=. --show-bil -- 2d e9 f8 43
{
  #3 := SP - 0x20
  mem := mem with [#3, el]:u32 <- R3
  mem := mem with [#3 + 4, el]:u32 <- R4
  mem := mem with [#3 + 8, el]:u32 <- R5
  mem := mem with [#3 + 0xC, el]:u32 <- R6
  mem := mem with [#3 + 0x10, el]:u32 <- R7
  mem := mem with [#3 + 0x14, el]:u32 <- R8
  mem := mem with [#3 + 0x18, el]:u32 <- R9
  mem := mem with [#3 + 0x1C, el]:u32 <- LR
  SP := #3
}
```

In fact, we can also put into a macro the body of our function, and our length macro will be of use here, e.g.,

```lisp
(defun llvm-thumb:t2STMDB_UPD (dst base _pred _? r1 r2 r3 r4 r5 r6 r7 r8)
  (stmdb_upd dst base r1 r2 r3 r4 r5 r6 r7 r8))

(defmacro stmdb_upd (dst base regs)
  (let ((len (length regs))
        (stride (sizeof word-width))
        (ptr (- base (* len stride))))
    (store-registers ptr stride 0 regs)
    (set$ dst ptr)))
```

### A side-note on the macro resolution mechanism

A small notice on the macro resolution process. Another way of describing it is that the rewriting engine picks the most specific definition. In fact, this is true for the definitions also. The resolution mechanism collects all definitions for the given name that matches the given context and selects the most specific. The context is defined using the Primus Lisp type class mechanism. The only difference between macros and functions (beyond that macros operate on the syntax tree level) is that macros add the number of arguments (arity) to the context so that the definition with the highest arity is ordered after (have precedence over) all other definitions. This is described more thoroughly in the reference documentation. Another important takeaway for us is that when we write a lifter we end up referencing target-specific functions and registers. So we would like to limit the context of the applicability of our functions to the specified target. (Otherwise, our functions will be loaded and type-checked for all architectures, e.g., when an x86 binary is parsed, and we don't want this). Therefore, we should start our lifter with the context declaration that will be automatically attached to each definition in the file,

```lisp
(declare (context (target arm)))
```

## Taming names with namespaces and packages

Now, let's look into the packages. A package is the Common Lisp (and Lisp in general) name for a namespace. A namespace is just a set of names, and each name in Primus Lisp has a package. In fact, when we write `(defmacro stmdb_upd () ...)`, i.e., without specifying the namespace, the name is automatically prefixed with the current namespace/package. By default, it is the `user` package. So our definition was read by the Lisp reader as `(defmacro user:stmdb_upd ...)`. It is not only the macro or function names that are packaged. Any identifier is properly namespaced. So that `(store-registers ptr stride 0 regs)` is read as `(user:store-registers user:ptr user:stride 0 user:regs)`.

The namespaces are also thoroughly described in the documentation but the rendered documentation is outdated because our bot is broken (I really need to fix it), so right now I can only refer you to the sources of the [documentation in the mli file][10]. And if you have bap installed in opam, then you can also install `odig` and `odoc` and use `odig` doc bap to generate and read the documentation on your machine. (It will spill an error but just repeat and it will show the correctly rendered documentation, it is a bug upstream that we have reported but... well I have diverged).

what we will do now, we will define the thumb package and llvm-thumb package. The first package will be our working package where we will put all our definitions. And the second package will be specific to llvm,
```
(defpackage thumb (:use core target arm))
(defpackage llvm-thumb (:use thumb))

(in-package thumb)
```

The `(:use core target arm)` stanza means that all definitions in these packages are imported (read "copied") into the `thumb` package. And the same for `llvm-thumb`, basically, `(defpackage llvm-thumb (:use thumb))` means copy (export) all definitions from `thumb` to `llvm-thumb`.

Both `thumb` and `llvm-thumb` packages are already defined in BAP, so we can just say
```
(in-package thumb)
```

Unlike Common Lisp, in Primus Lisp, the same package could be defined multiple times and even used before defined. The packages may even mutually import each other. The package system resolves it and finds the least fixed point, but it is probably too much for such a simple tutorial. For us, the main takeaway is that we don't need to write llvm-thumb and are no longer polluting the namespace with our definitions thanks to packaging and contexts.

## The final step, writing overloads

Unfortunately, there is no macro mechanism that will operate on the definition level and generate definitions from some pattern. We probably will develop something for that, but right now for each overload we still need to write a corresponding function, e.g.,
```lisp
(defun t2STMDB_UPD (dst base _pred _?
                      r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13 r14 r15)
  (stmdb_upd dst base r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13 r14 r15))
....
(defun t2STMDB_UPD (dst base _pred _?
                      r1)
  (stmdb_upd dst base r1))
```

So that the final version of our code will look like this (see also the [gist][11] version)

```lisp
(declare (context (target arm)))

(in-package thumb)

(defun t2STMDB_UPD (dst base _pred _?
                      r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13 r14 r15)
  (stmdb_upd dst base r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13 r14 r15))

(defun t2STMDB_UPD (dst base _pred _?
                      r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13 r14)
  (stmdb_upd dst base r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13 r14))

(defun t2STMDB_UPD (dst base _pred _?
                      r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13)
  (stmdb_upd dst base r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13))

(defun t2STMDB_UPD (dst base _pred _?
                      r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12)
  (stmdb_upd dst base r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12))

(defun t2STMDB_UPD (dst base _pred _?
                      r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11)
  (stmdb_upd dst base r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11))

(defun t2STMDB_UPD (dst base _pred _?
                      r1 r2 r3 r4 r5 r6 r7 r8 r9 r10)
  (stmdb_upd dst base r1 r2 r3 r4 r5 r6 r7 r8 r9 r10))

(defun t2STMDB_UPD (dst base _pred _?
                      r1 r2 r3 r4 r5 r6 r7 r8 r9)
  (stmdb_upd dst base r1 r2 r3 r4 r5 r6 r7 r8 r9))

(defun t2STMDB_UPD (dst base _pred _?
                      r1 r2 r3 r4 r5 r6 r7 r8)
  (stmdb_upd dst base r1 r2 r3 r4 r5 r6 r7 r8))

(defun t2STMDB_UPD (dst base _pred _?
                      r1 r2 r3 r4 r5 r6 r7)
  (stmdb_upd dst base r1 r2 r3 r4 r5 r6 r7))

(defun t2STMDB_UPD (dst base _pred _?
                      r1 r2 r3 r4 r5 r6)
  (stmdb_upd dst base r1 r2 r3 r4 r5 r6))

(defun t2STMDB_UPD (dst base _pred _?
                      r1 r2 r3 r4 r5)
  (stmdb_upd dst base r1 r2 r3 r4 r5))

(defun t2STMDB_UPD (dst base _pred _?
                      r1 r2 r3 r4)
  (stmdb_upd dst base r1 r2 r3 r4))

(defun t2STMDB_UPD (dst base _pred _?
                      r1 r2 r3)
  (stmdb_upd dst base r1 r2 r3))

(defun t2STMDB_UPD (dst base _pred _?
                      r1 r2)
  (stmdb_upd dst base r1 r2))

(defun t2STMDB_UPD (dst base _pred _?
                      r1)
  (stmdb_upd dst base r1))

(defmacro stmdb_upd (dst base regs)
  (let ((len (length regs))
        (stride (sizeof word-width))
        (ptr (- base (* len stride))))
    (store-registers ptr stride 0 regs)
    (set$ dst ptr)))

(defmacro store-registers (base stride off reg)
  (store-word (+ base (* stride off)) reg))

(defmacro store-registers (base stride off reg regs)
  (prog
     (store-registers base stride off reg)
     (store-registers base stride (+ off 1) regs)))

(defmacro length (r) 1)
(defmacro length (_ rs) (+ 1 (length rs)))
```

I think on this we can conclude our tutorial. I will later polish it, but it covers most of the features of Primus Lisp and writing lifters.

Except for the last step - which is making a PR to BAP with the file. Please, once you wrote a semantics for a machine instruction do not hesitate and PR it to the main repository. It should go to plugins/<target>/semantics/<your-file>, or you can just add the lisp code to an existing lisp file in this folder if you think it would be easier to maintain. This will be highly appreciated.

Happy lifting!

## The Bonus Track - Recitation

And as the final accord and recitation, let's check how we can lift `push {r1-r12,r14}`.

1) We will use `llvm-mc` to obtain the binary encoding,
```
$ echo 'push {r1-r12,r14}' | llvm-mc -triple=thumb -mattr=thumb2 -show-encoding
    .text
    push.w    {r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, lr} @ encoding: [0x2d,0xe9,0xfe,0x5f]
```
2) next we check that our overload is correctly picked up,
```
$ bap mc --arch=thumb --primus-lisp-semantics=. --show-bil -- 0x2d,0xe9,0xfe,0x5f
{
  #3 := SP - 0x34
  mem := mem with [#3, el]:u32 <- R1
  mem := mem with [#3 + 4, el]:u32 <- R2
  mem := mem with [#3 + 8, el]:u32 <- R3
  mem := mem with [#3 + 0xC, el]:u32 <- R4
  mem := mem with [#3 + 0x10, el]:u32 <- R5
  mem := mem with [#3 + 0x14, el]:u32 <- R6
  mem := mem with [#3 + 0x18, el]:u32 <- R7
  mem := mem with [#3 + 0x1C, el]:u32 <- R8
  mem := mem with [#3 + 0x20, el]:u32 <- R9
  mem := mem with [#3 + 0x24, el]:u32 <- R10
  mem := mem with [#3 + 0x28, el]:u32 <- R11
  mem := mem with [#3 + 0x2C, el]:u32 <- R12
  mem := mem with [#3 + 0x30, el]:u32 <- LR
  SP := #3
}
```
So, yay, it works! :)




[1]: https://binaryanalysisplatform.github.io/bap/api/master/bap-primus/Bap_primus/Std/Primus/Lisp/index.html
[2]: https://llvm.org/docs/MIRLangRef.html
[3]: https://llvm.org/docs/TableGen/
[4]: https://github.com/llvm/llvm-project/blob/1a56a291c5ab4681fb34386f1501336545daa8d6/llvm/lib/Target/ARM/ARMInstrThumb2.td#L5048-L5049
[5]: https://developer.arm.com/documentation/100076/0100/a32-t32-instruction-set-reference
[6]: https://developer.arm.com/documentation/ddi0406/latest
[7]: https://documentation-service.arm.com/static/5f8daeb7f86e16515cdb8c4e?token=
[8]: https://binaryanalysisplatform.github.io/bap/api/master/bap-primus/Bap_primus/Std/Primus/Lisp/index.html
[9]: https://files.gitter.im/552697e015522ed4b3dec2a1/xo1n/semantics.pdf
[10]: https://github.com/BinaryAnalysisPlatform/bap/blob/a9b8a329d63f2f723793a97d29028720ec8e3a18/lib/bap_primus/bap_primus.mli#L2753
[11]: https://gist.github.com/ivg/7ceb427a4bc7b5dd80f4ee467ba963d8
[12]: https://github.com/BinaryAnalysisPlatform/bap
