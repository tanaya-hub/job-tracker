const pool = require('../config/mysql');

const InterviewNote = require('../models/InterviewNote');

async function createCompany(req, res) {
  const { name, location, website } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Company name is required' });
  }

  const [result] = await pool.query(
    'INSERT INTO companies (user_id, name, location, website) VALUES (?, ?, ?, ?)',
    [req.user.id, name.trim(), location || null, website || null]
  );

  const [rows] = await pool.query('SELECT * FROM companies WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
}

async function getCompanies(req, res) {
  const { search } = req.query;

  let sql = 'SELECT * FROM companies WHERE user_id = ?';
  const params = [req.user.id];

  if (search) {
    sql += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }

  sql += ' ORDER BY created_at DESC';

  const [rows] = await pool.query(sql, params);
  res.json(rows);
}

async function getCompany(req, res) {
  const [rows] = await pool.query(
    'SELECT * FROM companies WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Company not found' });
  }
  res.json(rows[0]);
}

async function updateCompany(req, res) {
  const { name, location, website } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Company name is required' });
  }

  const [result] = await pool.query(
    'UPDATE companies SET name = ?, location = ?, website = ? WHERE id = ? AND user_id = ?',
    [name.trim(), location || null, website || null, req.params.id, req.user.id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Company not found' });
  }

  const [rows] = await pool.query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
}

async function deleteCompany(req, res) {
  const [apps] = await pool.query(
    'SELECT id FROM applications WHERE company_id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );
  const applicationIds = apps.map((a) => a.id);

  const [result] = await pool.query(
    'DELETE FROM companies WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Company not found' });
  }

  if (applicationIds.length > 0) {
    await InterviewNote.deleteMany({
      applicationId: { $in: applicationIds },
      userId: req.user.id,
    });
  }

  res.json({ message: 'Company deleted' });
}

module.exports = {
  createCompany,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
};