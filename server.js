const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { Web3 } = require('web3');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// === База данных ===
const db = new Database('zuzim.db');
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        telegram_id INTEGER PRIMARY KEY,
        address TEXT,
        balance_zuz REAL DEFAULT 0
    )
`);

// === Web3 ===
const web3 = new Web3(process.env.RPC_URL);
const TOKEN_ADDRESS = '0x87D336511760583B11B87866654c6f7253c1cB0D';
const PRESALE_ADDRESS = '0x8CdeBa5Db0a4046D8BBC655244173750c7DFd553';

// === API ===
app.post('/api/buy', async (req, res) => {
    const { telegram_id, ethAmount, txHash } = req.body;
    const zuzAmount = ethAmount / 0.0001;
    const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    db.prepare('UPDATE users SET balance_zuz = balance_zuz + ? WHERE telegram_id = ?').run(zuzAmount, telegram_id);
    res.json({ success: true, zuzAmount });
});

app.post('/api/register', (req, res) => {
    const { telegram_id, address } = req.body;
    const exists = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id);
    if (!exists) {
        db.prepare('INSERT INTO users (telegram_id, address) VALUES (?, ?)').run(telegram_id, address);
    }
    res.json({ success: true });
});

app.get('/api/balance/:telegram_id', (req, res) => {
    const user = db.prepare('SELECT balance_zuz FROM users WHERE telegram_id = ?').get(req.params.telegram_id);
    res.json({ balance: user?.balance_zuz || 0 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Zuzim Swap API on port ${PORT}`));
