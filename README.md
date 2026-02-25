# TaskRelay

> A P2P task delegation and confirmation board built on [Intercom](https://github.com/Trac-Systems/intercom) (Trac Network).

TaskRelay lets an admin peer post tasks over an Intercom sidechannel, and worker peers claim and confirm those tasks — all peer-to-peer, with no server or database. Task state is broadcast over the Intercom P2P network using Hyperswarm.

---

## 💡 What it does

- **Admin** posts tasks with a title and description
- **Workers** join the swarm, receive the task board, claim open tasks, and mark them done
- All updates propagate instantly to all connected peers
- No central server — pure P2P via Pear runtime on Trac Network

---

## 🚀 Quick Start

### Requirements
- [Pear runtime](https://docs.pears.com) installed (`npm i -g pear`)
- Node.js 20+

### Install
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/TaskRelay
cd TaskRelay
npm install
```

### Run

**Terminal 1 — Start as Admin (task poster):**
```bash
pear run . --admin
```

**Terminal 2 — Start as Worker:**
```bash
pear run . --worker
```

---

## 🖥️ Admin Commands

| Command | Description |
|---|---|
| `post My Task \| Do this thing` | Post a new task |
| `list` | View current task board |
| `quit` | Exit |

## 🔧 Worker Commands

| Command | Description |
|---|---|
| `list` | View current task board |
| `claim task-1-xxxxx` | Claim an open task |
| `done task-1-xxxxx` | Mark your claimed task as done |
| `quit` | Exit |

---

## 📸 Demo

Tasks flow from admin to workers in real time over the P2P sidechannel:

```
🟡 [task-1-1234567890] Write unit tests — open
🔵 [task-1-1234567890] Write unit tests — claimed (by peer: a3f9c2b1)
✅ [task-1-1234567890] Write unit tests — done
```

---

## 🏗️ Architecture

TaskRelay uses:
- **Hyperswarm** for peer discovery (via Intercom's sidechannel pattern)
- **Topic-based joining** so admin and workers find each other automatically
- **JSON messaging** over encrypted P2P connections
- **In-memory task store** that syncs to newly connected workers on join

---

## 🤖 Agent Instructions

See [`SKILL.md`](./SKILL.md) for full agent-oriented instructions on running and extending TaskRelay.

---

## Trac Reward Address

**Trac Address:** `trac120wu6rn2fmn3zs7cf24chrptkadq45cpa3xvlehm2vmc3qh9k80s6tzapw`

---

## License

MIT — fork freely, build on top.

---

*Forked from [Trac-Systems/intercom](https://github.com/Trac-Systems/intercom)*
