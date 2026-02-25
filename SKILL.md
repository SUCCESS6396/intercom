# SKILL.md — TaskRelay Agent Instructions

This file provides instructions for AI agents and automated systems on how to set up, run, and interact with **TaskRelay**, a P2P task delegation board built on Intercom (Trac Network).

---

## Overview

TaskRelay is a two-role application:

- **Admin peer** — posts tasks to the network and receives claim/completion events from workers
- **Worker peer** — joins the network, receives tasks, claims them, and marks them done

Communication happens over encrypted P2P sidechannels via Hyperswarm. No server required.

---

## Runtime Requirement

**Use Pear runtime only. Do not run with native Node.js.**

```bash
# Install Pear globally (once)
npm install -g pear
```

---

## Installation

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/TaskRelay
cd TaskRelay
npm install
```

---

## Starting the Application

### Start Admin peer (task poster):
```bash
pear run . --admin
```

### Start Worker peer:
```bash
pear run . --worker
```

> Run each in a separate terminal. Admin should start first. Workers may take a few seconds to discover the admin peer via Hyperswarm DHT.

---

## Admin Commands (interactive CLI)

Once running as admin, the following commands are available:

| Command | Effect |
|---|---|
| `post <title> \| <description>` | Creates and broadcasts a new task to all connected workers |
| `list` | Prints the current task board with status indicators |
| `quit` | Gracefully shuts down the swarm and exits |

**Example:**
```
> post Review PR #42 | Check the authentication module changes
```

---

## Worker Commands (interactive CLI)

Once running as a worker, the following commands are available:

| Command | Effect |
|---|---|
| `list` | Prints the current task board |
| `claim <task-id>` | Sends a claim request to admin for an open task |
| `done <task-id>` | Sends a completion notice to admin for your claimed task |
| `quit` | Gracefully shuts down and exits |

**Example:**
```
> claim task-1-1706789012345
> done task-1-1706789012345
```

---

## Task States

| Icon | Status | Meaning |
|---|---|---|
| 🟡 | `open` | Posted by admin, available to claim |
| 🔵 | `claimed` | Claimed by a worker, in progress |
| ✅ | `done` | Completed and confirmed |

---

## Network Behavior

- Admin and workers discover each other via a shared Hyperswarm topic derived from `taskrelay-intercom-v1`
- Admin acts as the server; workers act as clients
- When a new worker connects, admin immediately sends the full current task board (`task_list` message)
- All task mutations (new task, claim, done) are broadcast to all connected peers
- Connections are encrypted end-to-end by Hyperswarm

---

## Message Protocol (JSON over P2P)

Messages are JSON objects with `{ type, payload }` structure:

| Type | Direction | Payload |
|---|---|---|
| `task_list` | Admin → Worker | Array of all current tasks |
| `new_task` | Admin → Worker | Single new task object |
| `task_update` | Admin → Worker | Updated task object after claim/done |
| `claim` | Worker → Admin | `{ taskId: string }` |
| `complete` | Worker → Admin | `{ taskId: string }` |
| `error` | Admin → Worker | `{ message: string }` |

---

## Extending TaskRelay

To add your own app logic:

1. Add new message types to the `conn.on('data')` handler in `index.js`
2. Persist task state to a Hyperbee or Autobase for durability across restarts
3. Add authentication by verifying peer public keys against an allowlist
4. Replace the CLI with a web UI served via a local HTTP server

---

## Troubleshooting

**Workers not connecting:**
- Ensure the admin peer is running first
- Check firewall settings — Hyperswarm needs UDP/TCP outbound
- Try waiting 10–15 seconds for DHT peer discovery

**`pear` command not found:**
- Run `npm install -g pear` and ensure your global npm bin is in PATH

---

## Dependencies

- `hyperswarm` — P2P peer discovery and encrypted connections
- `hypercore-crypto` — Key and topic derivation
- `b4a` — Buffer/string utilities

---

*Part of the Intercom ecosystem. Upstream: https://github.com/Trac-Systems/intercom*
