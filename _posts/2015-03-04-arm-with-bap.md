---
layout: post
permalink: arm_with_bap
title: Compiling ARM binaries for use with BAP
---

This post serves to give some guidance on obtaining the disassembly and CFG for
your own binaries with BAP. For sample coreutils ARM binaries that can be used
with BAP, see
[here](https://github.com/BinaryAnalysisPlatform/arm-binaries/tree/master/coreutils).


  1. You'll need to install an ARM compiler toolchain. Depending on your needs,
     you can choose to use either the default toolchains included with the Ubuntu
     package repository, or a third-party toolchain based off of mainline gcc
     (e.g.  CodeSourcery, Linode, etc).

     For our purposes, we'll stick with Ubuntu 14.04, which provides five
     different varieties: `gcc-arm-linux-gnueabi`, `gcc-arm-linux-gnueabihf`,
     `gcc-aarch64-linux-gnu`, `gcc-arm-linux-androideabi`, and `gcc-none-eabi`.
     Of these, you probably won't be using the latter three, since they are for
     64-bit ARM, Android on ARM, and raw ARM binaries (e.g. without Linux). Of
     the remaining two, the former is soft-float, meaning it doesn't use Thumb
     instructions or a hardware floating-point unit, whereas the latter uses
     both, so we want to pick `gcc-arm-linux-gnueabi`. This should
     automatically add in associated dependencies such as
     `libc6-dev-armel-cross` and `binutils-arm-linux-gnueabi`, but not gdb, so
     you will need to specify it manually as follows:

     ```
     sudo apt-get install gcc-arm-linux-gnueabi gdb-multiarch
     ```

  2. A simple "Hello World" program can be compiled in the familiar gcc fashion:

     ```
     arm-linux-gnueabi-gcc hello.c -O0 -o hello_gccarm_O0
     ```

  3. To run this (should you be interested), you'll need `qemu-arm` from `qemu-user`:

     ```
     sudo apt-get install qemu-user
     ```

  4. Attempting to run our binary with

     ```
     qemu-user hello_gccarm_O0 # wrong!
     ```

     results in: `"/lib/ld-linux.so.3: No such file or directory"`.

     We will need these shared libraries built for arm. These are available after
     installing the arm compiler toolchain. To successfully run
     our binary, the command is:

     ```
     qemu-arm -L /usr/arm-linux-gnueabi/ hello_gccarm_O0
     ```

  5. You may view `bap-objdump` disassembly of your binary by running:

     ```
     bap-objdump --dump=asm strcpy_arm_g
     ```

<h2>Extras</h2>

You might like to debug your ARM binary with gdb. To do so, use qemu-arm to set
up a gdb server which you'll be able to connect:

```
qemu-arm -L /usr/arm-linux-gnueabi/ -g 1111 hello_gccarm_O0
```

Then connect to it as follows:

```
gdb-multiarch -q -nx
(gdb) file hello_gccarm_O0
(gdb) set architecture arm
(gdb) target remote 127.0.0.1:1111
```

You should now have a debugging session with gdb.

Take note that there are other useful utilities under `arm-linux-gnueabi-*`.
For example, you might be interested in stripping your binary before analysis,
using:

```
arm-linux-gnueabi-strip hello_gcc_arm_O0
```
