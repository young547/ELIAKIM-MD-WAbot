const {
  default: makeWASocket,
  useSingleFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  delay,
} = require('@adiwajshing/baileys')
const P = require('pino')
const fs = require('fs')
const chalk = require('chalk')

const prefix = '!'
const ownerNumber = '254739320033@s.whatsapp.net' // replace with your WhatsApp ID

const { state, saveState } = useSingleFileAuthState('./auth_info.json')

async function startBot() {
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(chalk.bold.hex('#FF4500')('\n\n==== ELIAKIM-MD WhatsApp Bot ====\n'))

  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: true,
logger: P({ level: 'silent' }),
    msgRetryCounterMap: makeCacheableSignalKeyStore(),
    browser: ['ELIAKIM-MD', 'Chrome', '1.0.0'],
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      if ((lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
        console.log('Reconnecting...')
        startBot()
      } else {
        console.log('Logged out, please delete auth_info.json and restart')
      }
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp')
    }
  })

  sock.ev.on('creds.update', saveState)

  // Anti-delete feature
  sock.ev.on('message.delete', async (m) => {
    try {
      const jid = m.key.remoteJid
      const isGroup = jid.endsWith('@g.us')

      // Forward deleted message to owner only
      if (!m.message) return

      const deletedMessage = m.message

      await sock.sendMessage(ownerNumber, {
        text: `⚠️ A message was deleted from jid:{JSON.stringify(deletedMessage, null, 2)}`,
      })
    } catch (err) {
      console.error('Anti-delete error:', err)
    }
  })

  // Welcome/left messages
  sock.ev.on('group-participants.update', async (update) => {
    const groupId = update.id
for (const participant of update.participants) {
      if (update.action === 'add') {
        await sock.sendMessage(groupId, { text: `Welcome @participant.split('@')[0] to the group¡,  mentions: [participant] )
      
      if (update.action === 'remove') 
        await sock.sendMessage(groupId,  text: `Goodbye @{participant.split('@')[0]}!` }, { mentions: [participant] })
      }
    }
  })

  // Auto view status & auto like (simulate)
  async function autoViewStatus() {
    // This is a stub; Baileys currently does not support actual status views
    console.log(chalk.blue('Simulating status views and likes...'))
  }
  setInterval(autoViewStatus, 10 * 60 * 1000) // every 10 minutes

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const sender = msg.key.remoteJid
    const isGroup = sender.endsWith('@g.us')
    const messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text || ''

    // Offline auto-reply in private chats only
    if (!isGroup) {
      await sock.sendPresenceUpdate('composing', sender)
      await delay(1500)
await sock.sendMessage(sender, { text: 'I am currently offline, will reply soon.' })
      await sock.sendPresenceUpdate('paused', sender)
    }

    // Commands only in private or groups (optional)
    if (!messageContent.startsWith(prefix)) return

    const args = messageContent.slice(prefix.length).trim().split(/ +/)
    const cmd = args.shift().toLowerCase()

    switch (cmd) {
      case 'ping': {
        const start = Date.now()
        await sock.sendMessage(sender, { text: 'Pinging...' })
        const latency = Date.now() - start
        await sock.sendMessage(sender, { text: `Pong! Response time: ${latency} ms` })
        break
      }
      case 'alive': {
        await sock.sendMessage(sender, {
          text: 'ELIAKIM-MD Bot is *online* and running smoothly! 🚀',
        })
        break
      }
      case 'download': {
        // Stub: download video logic here (YouTube etc)
        await sock.sendMessage(sender, { text: 'Downloading feature coming soon!' })
        break
      }
      // Add more commands as needed, check if sender is owner/admin for some commands
      default:
        await sock.sendMessage(sender, { text: 'Unknown command.' })
    }
  })

  // Save session on process exit
  process.on('SIGINT', async () => {
console.log('\nShutting down...')
    await sock.logout()
    process.exit(0)
  })
}

startBot()
