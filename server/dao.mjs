import db from './db.mjs';
import userDao from './dao-users.mjs';

const getAvailability = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM sizes ORDER BY price', [], (err, sizes) => {
      if (err) reject(err);
      else resolve(sizes.map(size => ({ ...size, available: size.daily_limit - size.used_quantity })));
    });
  });
};

const updateSizeUsedQuantity = (sizeCode, quantity) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM sizes WHERE code = ?', [sizeCode], (err, size) => {
      if (err) reject(err);
      else resolve(size);
    });
  }).then(size => {
    const newUsedQuantity = size ? size.used_quantity + quantity : 0;
    const errors = [
      ...(!size ? ['Invalid size'] : []),
      ...(!Number.isInteger(quantity) || quantity === 0 ? ['Invalid quantity'] : []),
      ...(size && newUsedQuantity < 0 ? ['Invalid availability update'] : []),
      ...(size && newUsedQuantity > size.daily_limit ? [`Not enough ${size.name} sandwiches available`] : [])
    ];

    if (errors.length) return { errors };

    return new Promise((resolve, reject) => {
      db.run('UPDATE sizes SET used_quantity = ? WHERE code = ?', [newUsedQuantity, sizeCode], function callback(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  });
};

const getMenu = () => {
  return Promise.all([
    getAvailability(),
    new Promise((resolve, reject) => {
      db.all("SELECT * FROM items WHERE type = 'main' ORDER BY name", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),
    new Promise((resolve, reject) => {
      db.all("SELECT * FROM items WHERE type = 'bread' ORDER BY name", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),
    new Promise((resolve, reject) => {
      db.all("SELECT * FROM items WHERE type = 'ingredient' ORDER BY name", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),
    new Promise((resolve, reject) => {
      db.all("SELECT * FROM items WHERE type = 'dressing' ORDER BY name", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    })
  ]).then(([sizes, mains, breads, ingredients, dressings]) => {
    return { sizes, mains, breads, ingredients, dressings };
  });
};


const getUserOrders = userId => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, total_price, discount
       FROM orders
       WHERE user_id = ?
       ORDER BY id DESC`,
      [userId],
      (err, orders) => {
        if (err) reject(err);
        else resolve(orders);
      }
    );
  }).then(orders => Promise.all(orders.map(order => {
    return getSandwichesByOrder(order.id).then(sandwiches => {
      return { ...order, sandwiches };
    });
  })));
};


const getSandwichesByOrder = orderId => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT s.id, s.size_code, s.quantity, s.main_id, main.name AS main_name,
              s.bread_id, bread.name AS bread_name
       FROM sandwiches s, items main, items bread
       WHERE s.main_id = main.id
         AND s.bread_id = bread.id
         AND s.order_id = ?
       ORDER BY s.id`,
      [orderId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  }).then(rows => Promise.all(rows.map(sandwich => {
    return Promise.all([
      new Promise((resolve, reject) => {
        db.all(
          `SELECT si.item_id AS id, i.name
           FROM sandwich_items si, items i
           WHERE si.item_id = i.id
             AND si.sandwich_id = ?
             AND i.type = 'ingredient'
           ORDER BY i.name`,
          [sandwich.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      }),
      new Promise((resolve, reject) => {
        db.all(
          `SELECT si.item_id AS id, i.name
           FROM sandwich_items si, items i
           WHERE si.item_id = i.id
             AND si.sandwich_id = ?
             AND i.type = 'dressing'
           ORDER BY i.name`,
          [sandwich.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      })
    ]).then(([ingredients, dressings]) => {
      return { ...sandwich, ingredients, dressings };
    });
  })));
};


const getItem = (id, type) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM items WHERE id = ? AND type = ?', [id, type], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const uniqueNumbers = values => {
  const numbers = (values || []).map(Number);
  return numbers.filter((value, index) => numbers.indexOf(value) === index);
};

const sandwichPrice = (size, ingredientCount) => {
  const extraIngredients = Math.max(0, ingredientCount - size.included_ingredients);
  return Math.round(size.price * (1 + extraIngredients * 0.3) * 100) / 100;
};

const sumQuantity = sandwiches => {
  if (sandwiches.length === 0) return 0;
  return sandwiches[0].quantity + sumQuantity(sandwiches.slice(1));
};

const sumPrices = sandwiches => {
  if (sandwiches.length === 0) return 0;
  return sandwiches[0].unitPrice * sandwiches[0].quantity + sumPrices(sandwiches.slice(1));
};

const getValidItems = (ids, type, errorMessage) => {
  return Promise.all(ids.map(id => {
    return getItem(id, type).then(item => {
      return item ? { item } : { error: errorMessage };
    });
  }));
};

const checkSandwich = sandwich => {
  const quantity = Number(sandwich.quantity);
  const ingredientIds = uniqueNumbers(sandwich.ingredientIds);
  const dressingIds = uniqueNumbers(sandwich.dressingIds);

  return Promise.all([
    new Promise((resolve, reject) => {
      db.get('SELECT * FROM sizes WHERE code = ?', [sandwich.size], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    }),
    getItem(sandwich.mainId, 'main'),
    getItem(sandwich.breadId, 'bread'),
    getValidItems(ingredientIds, 'ingredient', 'Invalid optional ingredient'),
    getValidItems(dressingIds, 'dressing', 'Invalid dressing')
  ]).then(([size, main, bread, ingredientResults, dressingResults]) => {
    const ingredients = ingredientResults.filter(result => result.item).map(result => result.item);
    const dressings = dressingResults.filter(result => result.item).map(result => result.item);
    const errors = [
      ...(!size ? ['Invalid sandwich size'] : []),
      ...(!main ? ['Select a valid main ingredient'] : []),
      ...(!bread ? ['Select a valid bread type'] : []),
      ...(!Number.isInteger(quantity) || quantity <= 0 ? ['Quantity must be a positive integer'] : []),
      ...ingredientResults.filter(result => result.error).map(result => result.error),
      ...dressingResults.filter(result => result.error).map(result => result.error),
      ...(size && dressingIds.length > size.max_dressings
        ? [`${size.name} sandwiches can have at most ${size.max_dressings} dressing(s)`]
        : [])
    ];

    const unitPrice = size ? sandwichPrice(size, ingredientIds.length) : 0;
    return { errors, size, main, bread, ingredients, dressings, quantity, unitPrice };
  });
};

const calculateOrder = sandwiches => {
  if (!Array.isArray(sandwiches) || sandwiches.length === 0) {
    return Promise.resolve({ errors: ['The order must contain at least one sandwich'] });
  }

  return Promise.all(sandwiches.map(sandwich => checkSandwich(sandwich)))
    .then(items => {
      const errors = [].concat(...items.map(item => item.errors));
      const validSandwiches = items.filter(item => item.errors.length === 0);

      const subtotal = sumPrices(validSandwiches);
      const totalQuantity = sumQuantity(validSandwiches);
      const discount = totalQuantity >= 4 ? Math.round(subtotal * 0.2 * 100) / 100 : 0;
      const total = Math.round((subtotal - discount) * 100) / 100;

      return getAvailability().then(sizes => {
        const availabilityErrors = sizes
          .filter(size => sumQuantity(validSandwiches.filter(item => item.size.code === size.code)) > size.available)
          .map(size => `Not enough ${size.name} sandwiches available`);

        return {
          errors: [...errors, ...availabilityErrors],
          validSandwiches,
          subtotal,
          discount,
          total,
          totalQuantity
        };
      });
    });
};

const insertSandwichItems = (sandwichId, sandwich) => {
  const items = [
    ...sandwich.ingredients.map(ingredient => ingredient),
    ...sandwich.dressings.map(dressing => dressing)
  ];

  return Promise.all(items.map(item => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO sandwich_items(sandwich_id, item_id)
         VALUES (?, ?)`,
        [sandwichId, item.id],
        function callback(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });
  })).then(() => undefined);
};

const insertSandwiches = (orderId, sandwiches) => {
  return Promise.all(sandwiches.map(sandwich => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO sandwiches(order_id, size_code, main_id, bread_id, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [
          orderId,
          sandwich.size.code,
          sandwich.main.id,
          sandwich.bread.id,
          sandwich.quantity
        ],
        function callback(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    }).then(row => insertSandwichItems(row.lastID, sandwich));
  })).then(() => undefined);
};

const addConfirmedSandwiches = sandwiches => {
  if (sandwiches.length === 0) return Promise.resolve();
  return updateSizeUsedQuantity(sandwiches[0].size.code, sandwiches[0].quantity)
    .then(result => {
      if (result && result.errors) return result;
      return addConfirmedSandwiches(sandwiches.slice(1));
    });
};

const createOrder = (userId, sandwiches) => {
  let calculatedOrder;
  let insertedOrder;

  return calculateOrder(sandwiches)
    .then(order => {
      calculatedOrder = order;
      if (order.errors.length) return { errors: order.errors };

      return userDao.getUserById(userId).then(user => {
        if (!user || user.credit < order.total) return { errors: ['Insufficient credit'] };

        return new Promise((resolve, reject) => {
          db.run(
            'UPDATE users SET credit = ROUND(credit - ?, 2) WHERE id = ?',
            [order.total, userId],
            function callback(err) {
              if (err) reject(err);
              else resolve(this);
            }
          );
        })
          .then(() => new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO orders(user_id, total_price, discount)
               VALUES (?, ?, ?)`,
              [userId, order.total, order.discount],
              function callback(err) {
                if (err) reject(err);
                else resolve(this);
              }
            );
          }))
          .then(result => {
            insertedOrder = result;
            return insertSandwiches(result.lastID, order.validSandwiches);
          })
          .then(() => addConfirmedSandwiches(order.validSandwiches))
          .then(result => {
            if (result && result.errors) return { errors: result.errors };
            return userDao.getUserById(userId);
          })
          .then(updatedUser => {
            if (updatedUser.errors) return updatedUser;
            return {
              id: insertedOrder.lastID,
              total: calculatedOrder.total,
              discount: calculatedOrder.discount,
              credit: updatedUser.credit
            };
          });
      });
    });
};

const checkOrderOwnership = (orderId, userId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const removeConfirmedSandwiches = sandwiches => {
  if (sandwiches.length === 0) return Promise.resolve();
  return updateSizeUsedQuantity(sandwiches[0].size_code, -sandwiches[0].quantity)
    .then(result => {
      if (result && result.errors) return result;
      return removeConfirmedSandwiches(sandwiches.slice(1));
    });
};

const deleteOrder = (orderId, userId) => {
  let refund;

  return checkOrderOwnership(orderId, userId)
    .then(order => {
      if (!order) return { errors: ['Order not found'] };

      refund = Math.round(order.total_price * 0.9 * 100) / 100;
      return getSandwichesByOrder(orderId)
        .then(removeConfirmedSandwiches)
        .then(result => {
          if (result && result.errors) return { errors: result.errors };
          return new Promise((resolve, reject) => {
            db.run(
              `DELETE FROM sandwich_items
               WHERE sandwich_id IN (SELECT id FROM sandwiches WHERE order_id = ?)`,
              [orderId],
              function callback(err) {
                if (err) reject(err);
                else resolve(this);
              }
            );
          })
            .then(() => new Promise((resolve, reject) => {
              db.run('DELETE FROM sandwiches WHERE order_id = ?', [orderId], function callback(err) {
                if (err) reject(err);
                else resolve(this);
              });
            }))
            .then(() => new Promise((resolve, reject) => {
              db.run('DELETE FROM orders WHERE id = ? AND user_id = ?', [orderId, userId], function callback(err) {
                if (err) reject(err);
                else resolve(this);
              });
            }))
            .then(() => new Promise((resolve, reject) => {
              db.run('UPDATE users SET credit = ROUND(credit + ?, 2) WHERE id = ?', [refund, userId], function callback(err) {
                if (err) reject(err);
                else resolve(this);
              });
            }))
            .then(() => userDao.getUserById(userId))
            .then(user => ({ refund, credit: user.credit }));
        });
    });
};

export default { getMenu, getAvailability, getUserOrders, createOrder, deleteOrder };
