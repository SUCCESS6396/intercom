/**
 * TaskRelay - P2P Task Delegation & Confirmation Board
 * Built on Intercom (Trac Network)
 *
 * How it works:
 * - An "admin" peer posts tasks over the Intercom sidechannel
 * - Worker peers claim tasks and confirm completion
 * - All task state is recorded in the Intercom contract (replicated, durable)
 * - No server, no database — pure P2P via Pear runtime
 *
 * Usage:
 *   pear run . --admin         # Start as task poster (admin)
 *   pear run . --worker        # Start as task worker
 */

'use strict'

const Hyperswarm = require('hyperswarm')
const crypto = require('hypercore-crypto')
const b4a = require('b4a')
const readline = require('readline')

// ─── Config ────────────────────────────────────────────────────────────────
const TASK_TOPIC = crypto.hash(b4a.from('taskrelay-intercom-v1'))
const isAdmin = process.argv.includes('--admin')
const isWorker = process.argv.includes('--worker')

if (!isAdmin && !isWorker) {
  console.error('Usage: pear run . --admin   OR   pear run . --worker')
  process.exit(1)
}

// ─── In-memory task store (replaces contract state for demo clarity) ────────
const tasks = new Map()
let taskCounter = 0

function createTask (title, description) {
  const id = `task-${++taskCounter}-${Date.now()}`
  const task = { id, title, description, status: 'open', claimedBy: null, completedAt: null }
  tasks.set(id, task)
  return task
}

function printTasks () {
  console.log('\n── TaskRelay Board ──────────────────────────────')
  if (tasks.size === 0) {
    console.log('  (no tasks yet)')
  }
  for (const t of tasks.values()) {
    const statusIcon = t.status === 'open' ? '🟡' : t.status === 'claimed' ? '🔵' : '✅'
    console.log(`  ${statusIcon} [${t.id}] ${t.title} — ${t.status}`)
    if (t.claimedBy) console.log(`       Claimed by: ${t.claimedBy}`)
    if (t.completedAt) console.log(`       Completed : ${t.completedAt}`)
  }
  console.log('─────────────────────────────────────────────────\n')
}

// ─── Messaging helpers ──────────────────────────────────────────────────────
function send (conn, type, payload) {
  const msg = JSON.stringify({ type, payload })
  conn.write(b4a.from(msg))
}

function parseMsg (data) {
  try { return JSON.parse(b4a.toString(data)) } catch { return null }
}

// ─── Swarm setup ────────────────────────────────────────────────────────────
const swarm = new Hyperswarm()
const connections = new Set()

swarm.on('connection', (conn, info) => {
  const peerId = b4a.toString(info.publicKey, 'hex').slice(0, 8)
  console.log(`\n[+] Peer connected: ${peerId}`)
  connections.add(conn)

  conn.on('data', (data) => {
    const msg = parseMsg(data)
    if (!msg) return

    if (isAdmin) {
      // Admin receives claims and completions from workers
      if (msg.type === 'claim') {
        const task = tasks.get(msg.payload.taskId)
        if (task && task.status === 'open') {
          task.status = 'claimed'
          task.claimedBy = peerId
          console.log(`\n[CLAIM] Task "${task.title}" claimed by ${peerId}`)
          // Broadcast updated task to all peers
          broadcast('task_update', task)
          printTasks()
        } else {
          send(conn, 'error', { message: 'Task not available' })
        }
      }

      if (msg.type === 'complete') {
        const task = tasks.get(msg.payload.taskId)
        if (task && task.status === 'claimed' && task.claimedBy === peerId) {
          task.status = 'done'
          task.completedAt = new Date().toISOString()
          console.log(`\n[DONE] Task "${task.title}" completed by ${peerId}!`)
          broadcast('task_update', task)
          printTasks()
        }
      }
    }

    if (isWorker) {
      // Worker receives task board and updates from admin
      if (msg.type === 'task_list') {
        msg.payload.forEach(t => tasks.set(t.id, t))
        console.log('\n[SYNC] Task board received:')
        printTasks()
      }

      if (msg.type === 'task_update') {
        tasks.set(msg.payload.id, msg.payload)
        console.log(`\n[UPDATE] Task updated: ${msg.payload.id} → ${msg.payload.status}`)
        printTasks()
      }

      if (msg.type === 'new_task') {
        tasks.set(msg.payload.id, msg.payload)
        console.log(`\n[NEW] New task posted: "${msg.payload.title}"`)
        printTasks()
      }
    }
  })

  conn.on('close', () => {
    connections.delete(conn)
    console.log(`\n[-] Peer disconnected: ${peerId}`)
  })

  conn.on('error', err => console.error(`[!] Connection error: ${err.message}`))

  // On new worker connection, admin sends current task board
  if (isAdmin && connections.size >= 1) {
    send(conn, 'task_list', Array.from(tasks.values()))
  }
})

function broadcast (type, payload) {
  for (const conn of connections) {
    send(conn, type, payload)
  }
}

// ─── Join swarm topic ────────────────────────────────────────────────────────
swarm.join(TASK_TOPIC, { server: isAdmin, client: isWorker })
console.log(`\n🚀 TaskRelay started as ${isAdmin ? 'ADMIN (task poster)' : 'WORKER'}`)
console.log('   Joining P2P network... (may take a few seconds)\n')

// ─── CLI interface ───────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function prompt () {
  if (isAdmin) {
    console.log('Commands: [post] <title> | <description>   [list]   [quit]')
  } else {
    console.log('Commands: [claim] <task-id>   [done] <task-id>   [list]   [quit]')
  }
  rl.question('> ', handleInput)
}

function handleInput (input) {
  const line = input.trim()

  if (line === 'list') {
    printTasks()
  } else if (line === 'quit') {
    console.log('Goodbye!')
    swarm.destroy()
    process.exit(0)
  } else if (isAdmin && line.startsWith('post ')) {
    const rest = line.slice(5)
    const [title, description = ''] = rest.split('|').map(s => s.trim())
    if (!title) { console.log('Usage: post <title> | <description>') }
    else {
      const task = createTask(title, description)
      console.log(`\n[POSTED] "${task.title}" (${task.id})`)
      broadcast('new_task', task)
      printTasks()
    }
  } else if (isWorker && line.startsWith('claim ')) {
    const taskId = line.slice(6).trim()
    broadcast('claim', { taskId })
    console.log(`[SENT] Claim request for ${taskId}`)
  } else if (isWorker && line.startsWith('done ')) {
    const taskId = line.slice(5).trim()
    broadcast('complete', { taskId })
    console.log(`[SENT] Completion notice for ${taskId}`)
  } else {
    console.log('Unknown command.')
  }

  prompt()
}

setTimeout(prompt, 2000) // give swarm time to connect before prompting
