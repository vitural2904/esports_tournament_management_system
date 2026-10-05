import { test, expect, apiClient } from './fixtures.mjs';

test('public landing works without API calls and leads a member into the workspace', async ({ page, baseURL }) => {
  const api = apiClient(page, baseURL);
  const password = 'Temporary-Landing-Test-Password-42!';
  await api('/setup', { username: 'landing-admin', displayName: 'Landing Admin', password });
  await api('/logout', {});
  const apiRequests = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url()); });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'CHV Esport', exact: true })).toBeAttached();
  const login = page.getByRole('main').getByRole('link', { name: 'Đăng nhập', exact: true });
  await expect(login).toBeVisible();
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Đăng nhập', exact: true })).toBeVisible();
  expect(apiRequests).toEqual([]);
  await page.screenshot({ path: 'output/playwright/landing-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(login).toBeInViewport();
  await page.screenshot({ path: 'output/playwright/landing-mobile.png' });
  await login.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Tên đăng nhập', exact: true }).fill('landing-admin');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đăng xuất', exact: true })).toBeVisible();
});
