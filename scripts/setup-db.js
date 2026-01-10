import { MongoClient } from 'mongodb'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
dotenv.config()

async function setup() {
  console.log('Setting up database...')
  const client = await MongoClient.connect(process.env.MONGO_URI)
  const db = client.db()
  
  await db.createCollection('users').catch(() => {})
  await db.collection('users').createIndex({ username: 1 }, { unique: true })
  
  const guests = [
    { username: 'NexusPrime1', password: 'BuddyBoots1!', vCoins: 10000 },
    { username: 'NexusPrime2', password: 'BuddyBoots2!', vCoins: 10000 },
    { username: 'NexusPrime3', password: 'BuddyBoots3!', vCoins: 10000 }
  ]
  
  for (const g of guests) {
    await db.collection('users').updateOne(
      { username: g.username },
      { 
        $setOnInsert: {
          username: g.username,
          password: await bcrypt.hash(g.password, 10),
          vCoins: g.vCoins,
          level: 1,
          createdAt: new Date()
        }
      },
      { upsert: true }
    )
    console.log('✅ Created:', g.username)
  }
  
  console.log('Database setup complete!')
  await client.close()
}

setup().catch(console.error)
