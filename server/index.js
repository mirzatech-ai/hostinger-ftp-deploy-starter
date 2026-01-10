import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json())
app.use(express.static('dist'))

let db
MongoClient.connect(process.env.MONGO_URI).then(c => {
  db = c.db()
  console.log('✅ MongoDB Connected')
}).catch(err => console.error('MongoDB Error:', err))

app.get('/', (req, res) => {
  res.send('Superio.fun is LIVE!')
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const user = await db.collection('users').findOne({ username })
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { username: user.username, vCoins: user.vCoins || 10000 } })
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
})

let game = { players: {}, alive: 0 }

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id)
  game.alive++
  game.players[socket.id] = { id: socket.id, hp: 100, pos: [0, 5, 0] }
  socket.emit('gameState', game)
  
  socket.on('disconnect', () => {
    if (game.players[socket.id]?.hp > 0) game.alive--
    delete game.players[socket.id]
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log('🚀 Server running on port', PORT)
})
