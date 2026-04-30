const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { Web3 } = require('web3');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// === БАЗА ДАННЫХ ===
const db = new sqlite3.Database('zuzim.db');
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            telegram_id INTEGER PRIMARY KEY,
            address TEXT,
            balance_zuz REAL DEFAULT 0
        )
    `);
});

// === WEB3 ===
const web3 = new Web3(process.env.RPC_URL || 'https://eth.llamarpc.com');
const TOKEN_ADDRESS = '0x87D336511760583B11B87866654c6f7253c1cB0D';
const PRESALE_ADDRESS = '0x8CdeBa5Db0a4046D8BBC655244173750c7DFd553';
const TOKEN_PRICE_ETH = 0.0001;

// === API ===

// Регистрация / привязка кошелька
app.post('/api/register', (req, res) => {
    const { telegram_id, address } = req.body;
    db.get('SELECT * FROM users WHERE telegram_id = ?', [telegram_id], (err, user) => {
        if (!user) {
            db.run('INSERT INTO users (telegram_id, address) VALUES (?, ?)', [telegram_id, address]);
        } else if (address && user.address !== address) {
            db.run('UPDATE users SET address = ? WHERE telegram_id = ?', [address, telegram_id]);
        }
        res.json({ success: true });
    });
});

// Получение баланса
app.get('/api/balance/:telegram_id', (req, res) => {
    db.get('SELECT balance_zuz FROM users WHERE telegram_id = ?', [req.params.telegram_id], (err, row) => {
        res.json({ balance: row?.balance_zuz || 0 });
    });
});

// Покупка ZUZ (только симуляция, реальная транзакция через кошелёк)
app.post('/api/buy', (req, res) => {
    const { telegram_id, ethAmount, txHash } = req.body;
    if (!ethAmount || ethAmount < 0.01) {
        return res.status(400).json({ error: 'Минимальная покупка 0.01 ETH' });
    }
    const zuzAmount = ethAmount / TOKEN_PRICE_ETH;
    db.run('UPDATE users SET balance_zuz = balance_zuz + ? WHERE telegram_id = ?', [zuzAmount, telegram_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, zuzAmount });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ ZUZ Swap API running on port ${PORT}`);
});
