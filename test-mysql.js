require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DB,
    });
    const [rows] = await conn.query('SELECT 1 + 1 AS result');
    console.log('MySQL connected, test result:', rows[0].result);
    await conn.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}
test();