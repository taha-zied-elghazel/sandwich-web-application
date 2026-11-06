DROP TABLE IF EXISTS sandwich_items;
DROP TABLE IF EXISTS sandwiches;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS sizes;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  credit REAL NOT NULL,
  totp_secret TEXT,
  last_totp_step INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE sizes (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  included_ingredients INTEGER NOT NULL,
  max_dressings INTEGER NOT NULL,
  daily_limit INTEGER NOT NULL,
  used_quantity INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE items (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('main', 'bread', 'ingredient', 'dressing'))
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  total_price REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE sandwiches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  size_code TEXT NOT NULL,
  main_id INTEGER NOT NULL,
  bread_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(size_code) REFERENCES sizes(code),
  FOREIGN KEY(main_id) REFERENCES items(id),
  FOREIGN KEY(bread_id) REFERENCES items(id)
);

CREATE TABLE sandwich_items (
  sandwich_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  PRIMARY KEY(sandwich_id, item_id),
  FOREIGN KEY(sandwich_id) REFERENCES sandwiches(id),
  FOREIGN KEY(item_id) REFERENCES items(id)
);

INSERT INTO sizes(code, name, price, included_ingredients, max_dressings, daily_limit, used_quantity) VALUES
  ('S', 'Small', 5.00, 2, 1, 10, 6),
  ('M', 'Medium', 7.00, 3, 2, 8, 3),
  ('L', 'Large', 10.00, 4, 2, 6, 2);

INSERT INTO items(id, name, type) VALUES
  (1, 'Roast beef', 'main'),
  (2, 'Ham', 'main'),
  (3, 'Bacon', 'main'),
  (4, 'Wheat bread', 'bread'),
  (5, 'Brown bread', 'bread'),
  (6, 'Lettuce', 'ingredient'),
  (7, 'Olives', 'ingredient'),
  (8, 'Onions', 'ingredient'),
  (9, 'Cucumber', 'ingredient'),
  (10, 'Yellow cheese', 'ingredient'),
  (11, 'Tomatoes', 'ingredient'),
  (12, 'Mozzarella', 'ingredient'),
  (13, 'Olive oil', 'dressing'),
  (14, 'Mustard', 'dressing'),
  (15, 'Mayonnaise', 'dressing');

INSERT INTO users(id, email, name, hash, salt, credit, totp_secret) VALUES
  (1, 'user1@sandwich.com', 'Mario Rossi', '0eb64110ccfdc5197e08f64b7aa90d5572e34db3704ff93a84072d47daeda597', '96a0f4e845fc918f5400b4e92ed0d345', 71.00, 'LXBSMDTMSP2I5XFXIYRGFVWSFI'),
  (2, 'user2@sandwich.com', 'Luigi Verdi', 'e2d154a84fc9a8bb626cd4e53b83c9586aac6ab4951a3a38d262549c29f263af', 'cef0009f306c0743825d0a4d82b936cd', 62.00, 'LXBSMDTMSP2I5XFXIYRGFVWSFI'),
  (3, 'user3@sandwich.com', 'Maria Bianchi', '944a92a9005c710c1b8680de4ebdbf9bf6f02f52d50036e71b740288bbff4e32', 'cc87df425167e7e0d33555d096e11c2b', 100.00, 'LXBSMDTMSP2I5XFXIYRGFVWSFI'),
  (4, 'user4@sandwich.com', 'Francesca Neri', '4205f4b997488026ed0875355ef55dfeb63a3aefc3955a34e9b9c146655cc24c', '2cafabadd7d7fadf9c8e41c65133e45f', 100.00, 'LXBSMDTMSP2I5XFXIYRGFVWSFI');

INSERT INTO orders(id, user_id, total_price, discount) VALUES
  (1, 1, 5.00, 0.00),
  (2, 1, 14.00, 0.00),
  (3, 1, 10.00, 0.00),
  (4, 2, 15.00, 0.00),
  (5, 2, 7.00, 0.00),
  (6, 2, 16.00, 4.00);

INSERT INTO sandwiches(id, order_id, size_code, main_id, bread_id, quantity) VALUES
  (1, 1, 'S', 2, 4, 1),
  (2, 2, 'M', 1, 5, 2),
  (3, 3, 'L', 3, 4, 1),
  (4, 4, 'S', 3, 5, 1),
  (5, 4, 'L', 1, 4, 1),
  (6, 5, 'M', 2, 4, 1),
  (7, 6, 'S', 1, 5, 4);

INSERT INTO sandwich_items(sandwich_id, item_id) VALUES
  (1, 6),
  (1, 7),
  (1, 14),
  (2, 6),
  (2, 11),
  (2, 12),
  (2, 13),
  (3, 6),
  (3, 7),
  (3, 8),
  (3, 9),
  (3, 14),
  (3, 15),
  (4, 6),
  (4, 11),
  (4, 15),
  (5, 6),
  (5, 7),
  (5, 9),
  (5, 10),
  (5, 13),
  (5, 14),
  (6, 6),
  (6, 7),
  (6, 8),
  (6, 14),
  (6, 15),
  (7, 6),
  (7, 9);
