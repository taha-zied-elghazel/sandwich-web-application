"use strict";

const SERVER_BASE = 'http://localhost:3001/api/';

async function APICall(endpoint, method = 'GET', body = undefined, expectResponse = true) {
  let error = '';
  try {
    const response = await fetch(new URL(endpoint, SERVER_BASE), {
      method,
      body,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined
    });

    if (response.ok) {
      if (expectResponse) return await response.json();
      return undefined;
    }

    try {
      const parsed = await response.json();
      if (Array.isArray(parsed)) {
        error = parsed.map(e => e.msg || e).join(' | ');
      } else if (parsed.error) {
        error = parsed.error;
      } else if (parsed.errors) {
        error = parsed.errors.join(' | ');
      } else {
        error = 'Server error';
      }
    } catch {
      error = 'Server error';
    }
  } catch {
    error = 'Failed to contact the server';
  }
  throw { error };
}

const API = {
  getMenu: () => APICall('menu'),
  getSizes: () => APICall('sizes'),
  getOrders: () => APICall('orders'),
  createOrder: sandwiches => APICall('orders', 'POST', JSON.stringify({ sandwiches })),
  deleteOrder: orderId => APICall(`orders/${orderId}`, 'DELETE'),
  login: (email, password) => APICall('sessions', 'POST', JSON.stringify({ username: email, password })),
  loginTotp: code => APICall('login-totp', 'POST', JSON.stringify({ code })),
  getCurrentUser: () => APICall('sessions/current'),
  logout: () => APICall('sessions/current', 'DELETE', undefined, false)
};

export { API };
