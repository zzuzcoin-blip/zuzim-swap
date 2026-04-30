const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { Web3 } = require('web3');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// База данных (обычный sqlite3)
const db = new sqlite3.Database('zuzim.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        telegram_id INTEGER PRIMARY KEY,
        address TEXT,
        balance_zuz REAL DEFAULT 0
    )`);
});

// Web3
const web3 = new Web3(process.env.RPC_URL || 'https://eth.llamarpc.com');
const TOKEN_ADDRESS = '0x87D336511760583B11B87866654c6f7253c1cB0D';
const PRESALE_ADDRESS = '0x8CdeBa5Db0a4046D8BBC655244173750c7DFd553';

// API
app.post('/api/buy', async (req, res) => {
    const { telegram_id, ethAmount } = req.body;
    const zuzAmount = ethAmount / 0.0001;
    
    db.get('SELECT * FROM users WHERE telegram_id = ?', [telegram_id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        db.run('UPDATE users SET balance_zuz = balance_zuz + ? WHERE telegram_id = ?', [zuzAmount, telegram_id]);
        res.json({ success: true, zuzAmount });
    });
});

app.post('/api/register', (req, res) => {
    const { telegram_id, address } = req.body;
    db.get('SELECT * FROM users WHERE telegram_id = ?', [telegram_id], (err, user) => {
        if (!user) {
            db.run('INSERT INTO users (telegram_id, address) VALUES (?, ?)', [telegram_id, address]);
        }
        res.json({ success: true });
    });
});

app.get('/api/balance/:telegram_id', (req, res) => {
    db.get('SELECT balance_zuz FROM users WHERE telegram_id = ?', [req.params.telegram_id], (err, row) => {
        res.json({ balance: row?.balance_zuz || 0 });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Zuzim Swap API on port ${PORT}`));
