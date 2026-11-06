import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import { TOTP } from 'otpauth';
import { check, validationResult } from 'express-validator';
import dao from './dao.mjs';
import userDao from './dao-users.mjs';

const app = express();

app.use(morgan('dev'));
app.use(express.json());
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await userDao.getUser(username.toLowerCase(), password);
    if (!user) return done(null, false, { message: 'Incorrect username and/or password' });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => userDao.getUserById(id).then(user => done(null, user)).catch(done));

app.use(session({
  secret: 'sandwich exam secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.authenticate('session'));

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Not authenticated' });
};

const isTotp = (req, res, next) => {
  if (req.session.method === 'totp') return next();
  return res.status(401).json({ error: 'Missing TOTP authentication' });
};

const verifyTotpToken = (user, token) => {
  const totp = new TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: user.secret
  });

  const delta = totp.validate({ token, window: 1 });
  if (delta === null) return false;

  const actualStep = totp.counter() + delta;
  if (actualStep <= user.lastTotpStep) return false;

  user.lastTotpStep = actualStep;
  return true;
};

const errorFormatter = ({ location, msg, path }) => {
  return `${location}[${path}]: ${msg}`;
};

app.get('/api/menu', async (req, res) => {
  try {
    res.json(await dao.getMenu());
  } catch {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/sizes', async (req, res) => {
  try {
    res.json(await dao.getAvailability());
  } catch {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/orders', isLoggedIn, async (req, res) => {
  try {
    res.json(await dao.getUserOrders(req.user.id));
  } catch {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/orders',
  isLoggedIn,
  check('sandwiches').isArray({ min: 1 }).withMessage('The order must contain at least one sandwich'),
  check('sandwiches.*.size').isIn(['S', 'M', 'L']).withMessage('Invalid size'),
  check('sandwiches.*.mainId').isInt({ min: 1 }).withMessage('Invalid main ingredient'),
  check('sandwiches.*.breadId').isInt({ min: 1 }).withMessage('Invalid bread'),
  check('sandwiches.*.ingredientIds').isArray().withMessage('Ingredients must be an array'),
  check('sandwiches.*.ingredientIds.*').isInt({ min: 1 }).withMessage('Invalid ingredient'),
  check('sandwiches.*.dressingIds').isArray().withMessage('Dressings must be an array'),
  check('sandwiches.*.dressingIds.*').isInt({ min: 1 }).withMessage('Invalid dressing'),
  check('sandwiches.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
  async (req, res) => {
    const errors = validationResult(req).formatWith(errorFormatter);
    if (!errors.isEmpty()) return res.status(422).json(errors.errors);
    try {
      const result = await dao.createOrder(req.user.id, req.body.sandwiches);
      if (result.errors) return res.status(422).json({ error: result.errors.join(' | ') });
      return res.status(201).json(result);
    } catch {
      return res.status(500).json({ error: 'Database error' });
    }
  }
);

app.delete('/api/orders/:id', isLoggedIn, isTotp, async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(422).json({ error: 'Invalid order id' });
  }

  try {
    const result = await dao.deleteOrder(orderId, req.user.id);
    if (result.errors) return res.status(404).json({ error: result.errors.join(' | ') });
    return res.json(result);
  } catch {
    return res.status(500).json({ error: 'Database error' });
  }
});

app.post(
  '/api/sessions',
  check('username').isEmail().withMessage('Invalid email'),
  check('password').notEmpty().withMessage('Password cannot be empty'),
  (req, res, next) => {
    const errors = validationResult(req).formatWith(errorFormatter);
    if (!errors.isEmpty()) return res.status(422).json(errors.errors);

    passport.authenticate('local', (err, user, info) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!user) return res.status(401).json({ error: info.message });
      req.login(user, loginErr => {
        if (loginErr) return res.status(500).json({ error: 'Login error' });
        req.session.method = 'password';
        return res.json({
          email: user.username,
          name: user.name,
          credit: user.credit,
          canDoTotp: Boolean(user.secret),
          is2faVerified: req.session.method === 'totp'
        });
      });
    })(req, res, next);
  }
);

app.post('/api/login-totp', isLoggedIn, check('code').isLength({ min: 6, max: 6 }), (req, res) => {
  const errors = validationResult(req).formatWith(errorFormatter);
  if (!errors.isEmpty()) return res.status(422).json(errors.errors);

  if (!req.user.secret) return res.status(400).json({ error: 'Cannot authenticate with TOTP' });

  if (!verifyTotpToken(req.user, req.body.code)) {
    return res.status(401).json({ error: 'Invalid TOTP code' });
  }
  userDao.updateLastTotpStep(req.user.id, req.user.lastTotpStep)
    .then(() => {
      req.session.method = 'totp';
      return res.json({ otp: 'authorized' });
    })
    .catch(() => res.status(500).json({ error: 'Database error' }));
});

app.get('/api/sessions/current', isLoggedIn, (req, res) => {
  res.json({
    email: req.user.username,
    name: req.user.name,
    credit: req.user.credit,
    canDoTotp: Boolean(req.user.secret),
    is2faVerified: req.session.method === 'totp'
  });
});

app.delete('/api/sessions/current', isLoggedIn, (req, res) => {
  req.logout(() => {
    req.session.destroy(() => res.end());
  });
});

const PORT = 3001;
app.listen(PORT, err => {
  if (err)
    console.log(err);
  else
    console.log(`Server listening at http://localhost:${PORT}`);
});
