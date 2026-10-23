import { request } from './api.js';

export async function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: { username, password },
    credentials: 'include',
  });
}

export async function logout() {
  return request('/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}

export async function getCurrentUser() {
  return request('/auth/me', {
    credentials: 'include',
  });
}