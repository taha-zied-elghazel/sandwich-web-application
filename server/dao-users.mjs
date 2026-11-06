import crypto from 'crypto';
import db from './db.mjs';

const getUserById = id => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT id, email, name, credit, totp_secret, last_totp_step FROM users WHERE id = ?';
    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else if (row === undefined) resolve(false);
      else {
        resolve({
          id: row.id,
          username: row.email,
          name: row.name,
          credit: row.credit,
          secret: row.totp_secret,
          lastTotpStep: row.last_totp_step
        });
      }
    });
  });
};

const getUser = (email, password) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [email], (err, row) => {
      if (err) {
        reject(err);
      } else if (row === undefined) {
        resolve(false);
      } else {
        crypto.scrypt(password, row.salt, 32, (err, hashedPassword) => {
          if (err) reject(err);
          else if (!crypto.timingSafeEqual(Buffer.from(row.hash, 'hex'), hashedPassword)) {
            resolve(false);
          } else {
            resolve({
              id: row.id,
              username: row.email,
              name: row.name,
              credit: row.credit,
              secret: row.totp_secret,
              lastTotpStep: row.last_totp_step
            });
          }
        });
      }
    });
  });
};

const updateLastTotpStep = (userId, lastTotpStep) => {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE users SET last_totp_step = ? WHERE id = ?';
    db.run(sql, [lastTotpStep, userId], function callback(err) {
      if (err) reject(err);
      else if (this.changes !== 1) resolve({ error: 'User not found' });
      else resolve(this.changes);
    });
  });
};

export default { getUserById, getUser, updateLastTotpStep };
