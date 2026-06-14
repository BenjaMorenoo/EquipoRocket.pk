// Pruebas unitarias de src/services/api.js
// Cubre UT-FE-01: el interceptor de request de `gatewayAPI` agrega el header
// Authorization a partir de `localStorage.pk_token` cuando existe, y no lo
// agrega cuando no existe.
import { describe, test, expect, beforeEach } from 'vitest';
import { gatewayAPI } from './api';

function runRequestInterceptor(config) {
  return gatewayAPI.interceptors.request.handlers[0].fulfilled(config);
}

describe('UT-FE-01: interceptor de request de gatewayAPI', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('(a) con pk_token en localStorage, agrega Authorization: Bearer <token>', () => {
    localStorage.setItem('pk_token', 'abc123');

    const config = runRequestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer abc123');
  });

  test('(b) sin pk_token en localStorage, no agrega el header Authorization', () => {
    const config = runRequestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });
});
