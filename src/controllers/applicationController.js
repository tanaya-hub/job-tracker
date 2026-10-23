const pool = require('../config/mysql');
const InterviewNote = require('../models/InterviewNote');

const STATUSES = ['wishlist', 'applied', 'interview', 'offer', 'rejected'];

async function companyBelongsToUser(companyId, userId) {
  const [rows] = await pool.query(
    'SELECT id FROM companies WHERE id = ? AND user_id = ?',
    [companyId, userId]
  );
  return rows.length > 0;
}

async function createApplication(req, res) {
  const { company_id, job_title, status, applied_date, job_url } = req.body;

  if (!company_id || !job_title || !job_title.trim()) {
    return res.status(400).json({ message: 'company_id and job_title are required' });
  }
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${STATUSES.join(', ')}` });
  }
  if (!(await companyBelongsToUser(company_id, req.user.id))) {
    return res.status(404).json({ message: 'Company not found' });
  }

  const [result] = await pool.query(
    `INSERT INTO applications (user_id, company_id, job_title, status, applied_date, job_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      company_id,
      job_title.trim(),
      status || 'wishlist',
      applied_date || null,
      job_url || null,
    ]
  );

  const [rows] = await pool.query(
    `SELECT a.*, c.name AS company_name
     FROM applications a JOIN companies c ON c.id = a.company_id
     WHERE a.id = ?`,
    [result.insertId]
  );
  res.status(201).json(rows[0]);
}

async function getApplications(req, res) {
  const { status, search, company_id } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
  const offset = (page - 1) * limit;

  let where = 'WHERE a.user_id = ?';
  const params = [req.user.id];

  if (status) {
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${STATUSES.join(', ')}` });
    }
    where += ' AND a.status = ?';
    params.push(status);
  }
  if (company_id) {
    where += ' AND a.company_id = ?';
    params.push(company_id);
  }
  if (search) {
    where += ' AND (a.job_title LIKE ? OR c.name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM applications a JOIN companies c ON c.id = a.company_id ${where}`,
    params
  );
  const total = countRows[0].total;

  const [rows] = await pool.query(
    `SELECT a.*, c.name AS company_name
     FROM applications a JOIN companies c ON c.id = a.company_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json({
    data: rows,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

async function getApplication(req, res) {
  const [rows] = await pool.query(
    `SELECT a.*, c.name AS company_name
     FROM applications a JOIN companies c ON c.id = a.company_id
     WHERE a.id = ? AND a.user_id = ?`,
    [req.params.id, req.user.id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Application not found' });
  }
  res.json(rows[0]);
}

async function updateApplication(req, res) {
  const { company_id, job_title, status, applied_date, job_url } = req.body;

  if (!company_id || !job_title || !job_title.trim()) {
    return res.status(400).json({ message: 'company_id and job_title are required' });
  }
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${STATUSES.join(', ')}` });
  }
  if (!(await companyBelongsToUser(company_id, req.user.id))) {
    return res.status(404).json({ message: 'Company not found' });
  }

  const [result] = await pool.query(
    `UPDATE applications
     SET company_id = ?, job_title = ?, status = ?, applied_date = ?, job_url = ?
     WHERE id = ? AND user_id = ?`,
    [
      company_id,
      job_title.trim(),
      status || 'wishlist',
      applied_date || null,
      job_url || null,
      req.params.id,
      req.user.id,
    ]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Application not found' });
  }

  const [rows] = await pool.query(
    `SELECT a.*, c.name AS company_name
     FROM applications a JOIN companies c ON c.id = a.company_id
     WHERE a.id = ?`,
    [req.params.id]
  );
  res.json(rows[0]);
}

async function updateStatus(req, res) {
  const { status } = req.body;

  if (!status || !STATUSES.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${STATUSES.join(', ')}` });
  }

  const [result] = await pool.query(
    'UPDATE applications SET status = ? WHERE id = ? AND user_id = ?',
    [status, req.params.id, req.user.id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Application not found' });
  }
  res.json({ message: 'Status updated', status });
}

async function deleteApplication(req, res) {
  const [result] = await pool.query(
    'DELETE FROM applications WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Application not found' });
  }

  await InterviewNote.deleteMany({
    applicationId: Number(req.params.id),
    userId: req.user.id,
  });

  res.json({ message: 'Application deleted' });
}

async function getStats(req, res) {
  const [rows] = await pool.query(
    'SELECT status, COUNT(*) AS count FROM applications WHERE user_id = ? GROUP BY status',
    [req.user.id]
  );

  const stats = { wishlist: 0, applied: 0, interview: 0, offer: 0, rejected: 0 };
  rows.forEach((row) => {
    stats[row.status] = row.count;
  });

  const total = Object.values(stats).reduce((sum, n) => sum + n, 0);
  res.json({ total, ...stats });
}

module.exports = {
  createApplication,
  getApplications,
  getApplication,
  updateApplication,
  updateStatus,
  deleteApplication,
  getStats,
};