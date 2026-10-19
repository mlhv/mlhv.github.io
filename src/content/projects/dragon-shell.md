---
title: "Dragon Shell - Custom Shell and TCP Server"
description: "Built a UNIX shell in C, that runs piped commands and I/O redirection using fork, execvp, and dup2, cleaning up child processes with waitpid."
techStack: ["C","POSIX Sockets","pthreads","Linux"]
featured: false
order: 6
---

- Built a UNIX shell in C, that runs piped commands and I/O redirection using fork, execvp, and dup2, cleaning up child processes with waitpid.
- Extended shell into a multi-threaded TCP server in C, spawning a thread per client connection, allowing multiple users to run remote commands at once.
