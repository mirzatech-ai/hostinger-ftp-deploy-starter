import React from 'react'
import ReactDOM from 'react-dom/client'

const App = () => (
  <div style={{
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Impact, sans-serif',
    color: 'white'
  }}>
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: '5em', marginBottom: '20px' }}>SUPERIO.FUN</h1>
      <p style={{ fontSize: '2em' }}>🎮 Game Hub Coming Soon 🎮</p>
      <div style={{ marginTop: '40px', fontSize: '1.5em' }}>
        <div>Guest Accounts Ready:</div>
        <div>NexusPrime1 / BuddyBoots1!</div>
        <div>NexusPrime2 / BuddyBoots2!</div>
        <div>NexusPrime3 / BuddyBoots3!</div>
      </div>
    </div>
  </div>
)

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
