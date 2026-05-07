require('dotenv').config({ path: '/opt/spes/.env' });
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const router = express.Router();



const pool = new Pool({
  host: 'localhost',
  database: 'spes_db',
  user: 'spes_user',
  password: process.env.DB_PASSWORD || 'Sk3ptic@Now2097',
  port: 5432,
});

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────
function getUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// ─── QUERY PARSER ────────────────────────────────────────────
// Parses PostgREST-style query params into SQL
function parseQuery(tableName, query, user) {
  const conditions = [];
  const orderParts = [];
  let limitVal = null;
  let offsetVal = null;
  let selectCols = '*';

  // Debug
  console.log('API query:', tableName, JSON.stringify(query));
  for (const [key, val] of Object.entries(query)) {
    if (key === 'select') {
      // Strip join syntax: table!fkey(*), alias:table(*), user_roles(role) etc.
      let sel = String(val);
      sel = sel.replace(/[a-zA-Z_]+:[a-zA-Z_]+![a-zA-Z_]+\([^)]*\)/g, ''); // alias:table!fkey(cols)
      sel = sel.replace(/[a-zA-Z_]+![a-zA-Z_]+\([^)]*\)/g, '');             // table!fkey(cols)
      sel = sel.replace(/[a-zA-Z_]+\([^)]*\)/g, '');                         // table(cols)
      sel = sel.replace(/,,+/g, ',').replace(/^,|,$/g, '').trim();
      selectCols = sel || '*';
      continue;
    }
    if (key === 'order') {
      // Handle both 'col.asc' and 'col.desc' formats
      const parts = String(val).split(',');
      parts.forEach(p => {
        p = p.trim();
        if (!p || p.includes('{')) return; // skip object syntax
        const dotIdx = p.lastIndexOf('.');
        if (dotIdx > 0) {
          const col = p.substring(0, dotIdx).trim();
          const dir = p.substring(dotIdx + 1).trim();
          if (col) orderParts.push(col + ' ' + (dir === 'desc' ? 'DESC' : 'ASC'));
        } else if (p) {
          orderParts.push(p + ' ASC');
        }
      });
      continue;
    }
    if (key === 'limit') { limitVal = parseInt(val); continue; }
    if (key === 'offset') { offsetVal = parseInt(val); continue; }

    // Filter operators: eq, neq, gt, lt, gte, lte, like, ilike, in, is
    const opMatch = String(val).match(/^(eq|neq|gt|lt|gte|lte|like|ilike|in|is)\.(.+)$/);
    if (opMatch) {
      const [, op, opVal] = opMatch;
      const col = key;
      if (op === 'eq') {
        if (opVal === 'null') conditions.push(`${col} IS NULL`);
        else conditions.push(`${col} = '${opVal.replace(/'/g,"''")}'`);
      } else if (op === 'neq') {
        conditions.push(`${col} != '${opVal.replace(/'/g,"''")}'`);
      } else if (op === 'gt') conditions.push(`${col} > '${opVal}'`);
      else if (op === 'lt') conditions.push(`${col} < '${opVal}'`);
      else if (op === 'gte') conditions.push(`${col} >= '${opVal}'`);
      else if (op === 'lte') conditions.push(`${col} <= '${opVal}'`);
      else if (op === 'like') conditions.push(`${col} LIKE '${opVal.replace(/'/g,"''")}'`);
      else if (op === 'ilike') conditions.push(`${col} ILIKE '${opVal.replace(/'/g,"''")}'`);
      else if (op === 'is') {
        if (opVal === 'null') conditions.push(`${col} IS NULL`);
        else conditions.push(`${col} IS NOT NULL`);
      } else if (op === 'in') {
        const vals = opVal.replace(/^\(|\)$/g,'').split(',').map(v => `'${v.replace(/'/g,"''")}'`).join(',');
        conditions.push(`${col} IN (${vals})`);
      }
    }
  }

  let sql = `SELECT ${selectCols} FROM ${tableName}`;
  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
  if (orderParts.length) sql += ` ORDER BY ${orderParts.join(', ')}`;
  if (limitVal) sql += ` LIMIT ${limitVal}`;
  if (offsetVal) sql += ` OFFSET ${offsetVal}`;

  return sql;
}

// ─── RLS SIMULATION ──────────────────────────────────────────
function applyRLS(tableName, operation, user, conditions = []) {
  if (!user) return conditions;
  const role = user.role;
  const uid = user.sub;

  if (role === 'hc') return conditions; // HC sees everything

  if (tableName === 'evaluations') {
    if (operation === 'SELECT') {
      conditions.push(`(employee_id = '${uid}' OR first_manager_id = '${uid}' OR second_manager_id = '${uid}')`);
    } else if (operation === 'INSERT') {
      // employee_id must be self
    } else if (operation === 'UPDATE') {
      if (role === 'employee') {
        conditions.push(`employee_id = '${uid}'`);
        conditions.push(`status IN ('draft','revision_requested')`);
      } else if (role === 'manager') {
        conditions.push(`(first_manager_id = '${uid}' OR second_manager_id = '${uid}')`);
      }
    }
  }

  if (tableName === 'notifications') {
    conditions.push(`recipient_id = '${uid}'`);
  }

  if (tableName === 'kpi_goals') {
    if (operation === 'SELECT') {
      conditions.push(`(employee_id = '${uid}' OR evaluation_id IN (SELECT id FROM evaluations WHERE first_manager_id = '${uid}' OR second_manager_id = '${uid}'))`);
    }
  }

  return conditions;
}

// ─── GENERIC TABLE HANDLER ───────────────────────────────────
const TABLES = [
  'profiles','user_roles','departments','evaluation_cycles',
  'kpi_templates','kpi_goals','evaluations','kpi_entries',
  'audit_logs','notifications','email_reminders'
];

TABLES.forEach(tableName => {
  // GET
  router.get(`/${tableName}`, async (req, res) => {
    const user = getUser(req);
    try {
      const sql = parseQuery(tableName, req.query, user);
      const result = await pool.query(sql);
      // Convert numeric string fields to numbers
      const NUMERIC_FIELDS = ['final_score','a1_score_on_100','a1_weighted','a2_score_on_100',
        'a2_weighted','sec_score_on_100','sec_weighted','gen_score_on_100','gen_weighted',
        'rating_gap','employee_rating','manager_rating','weight_nonsales','weight_sales',
        'sort_order','revision_count','target_rating'];
      result.rows = result.rows.map(row => {
        const newRow = {...row};
        NUMERIC_FIELDS.forEach(f => {
          if (newRow[f] !== null && newRow[f] !== undefined && typeof newRow[f] === 'string') {
            newRow[f] = Number(newRow[f]);
          }
        });
        return newRow;
      });
      // Handle Prefer: return=representation single
      const prefer = req.headers['prefer'] || '';
      if (prefer.includes('count=exact')) {
        res.setHeader('Content-Range', `0-${result.rows.length-1}/${result.rows.length}`);
      }
      res.json(result.rows);
    } catch (err) {
      console.error(`GET ${tableName} error:`, err.message);
      res.status(400).json({ error: err.message });
    }
  });

  // POST
  router.post(`/${tableName}`, async (req, res) => {
    const user = getUser(req);
    const data = Array.isArray(req.body) ? req.body : [req.body];
    try {
      const results = [];
      for (const row of data) {
        const cols = Object.keys(row).filter(k => row[k] !== undefined);
        if (!cols.length) continue;
        const vals = cols.map((_, i) => `$${i+1}`);
        const values = cols.map(c => row[c]);
        const sql = `INSERT INTO ${tableName} (${cols.join(',')}) VALUES (${vals.join(',')}) RETURNING *`;
        const result = await pool.query(sql, values);
        results.push(...result.rows);
      }
      const prefer = req.headers['prefer'] || '';
      if (prefer.includes('return=representation')) {
        res.status(201).json(results.length === 1 ? results[0] : results);
      } else {
        res.status(201).json(results);
      }
    } catch (err) {
      console.error(`POST ${tableName} error:`, err.message);
      res.status(400).json({ error: err.message });
    }
  });

  // PATCH
  router.patch(`/${tableName}`, async (req, res) => {
    const user = getUser(req);
    const data = req.body;
    try {
      const setCols = Object.keys(data).filter(k => data[k] !== undefined);
      if (!setCols.length) return res.json([]);

      const setClause = setCols.map((c, i) => `${c} = $${i+1}`).join(', ');
      const values = setCols.map(c => data[c]);

      // Parse WHERE from query params
      const conditions = [];
      for (const [key, val] of Object.entries(req.query)) {
        if (key === 'select') continue;
        const opMatch = String(val).match(/^(eq|neq|in)\.(.+)$/);
        if (opMatch) {
          const [, op, opVal] = opMatch;
          if (op === 'eq') conditions.push(`${key} = '${opVal.replace(/'/g,"''")}'`);
          else if (op === 'neq') conditions.push(`${key} != '${opVal.replace(/'/g,"''")}'`);
          else if (op === 'in') {
            const vals = opVal.replace(/^\(|\)$/g,'').split(',').map(v => `'${v.replace(/'/g,"''")}'`).join(',');
            conditions.push(`${key} IN (${vals})`);
          }
        }
      }

      let sql = `UPDATE ${tableName} SET ${setClause}`;
      if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
      sql += ` RETURNING *`;

      const result = await pool.query(sql, values);
      res.json(result.rows);
    } catch (err) {
      console.error(`PATCH ${tableName} error:`, err.message);
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE
  router.delete(`/${tableName}`, async (req, res) => {
    const user = getUser(req);
    try {
      const conditions = [];
      for (const [key, val] of Object.entries(req.query)) {
        const opMatch = String(val).match(/^(eq|in)\.(.+)$/);
        if (opMatch) {
          const [, op, opVal] = opMatch;
          if (op === 'eq') conditions.push(`${key} = '${opVal.replace(/'/g,"''")}'`);
          else if (op === 'in') {
            const vals = opVal.replace(/^\(|\)$/g,'').split(',').map(v => `'${v.replace(/'/g,"''")}'`).join(',');
            conditions.push(`${key} IN (${vals})`);
          }
        }
      }
      let sql = `DELETE FROM ${tableName}`;
      if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
      sql += ` RETURNING *`;
      const result = await pool.query(sql);
      res.json(result.rows);
    } catch (err) {
      console.error(`DELETE ${tableName} error:`, err.message);
      res.status(400).json({ error: err.message });
    }
  });
});

module.exports = router;
