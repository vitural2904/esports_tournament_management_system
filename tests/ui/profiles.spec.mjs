import sharp from 'sharp';
import { test, expect, prepare, openProfile } from './fixtures.mjs';

test('saving an uploaded logo preserves typed profile text and allows the next save', async ({ page, baseURL }) => {
  await prepare(page, baseURL);
  const profile = await openProfile(page);
  await profile.getByRole('button', { name: 'Sửa hồ sơ', exact: true }).click();
  await profile.getByRole('textbox', { name: 'Tên đội', exact: true }).fill('Aurora Updated');
  const editor = profile.getByRole('region', { name: 'Chỉnh logo đội', exact: true });
  await editor.getByRole('button', { name: 'Thêm logo đội', exact: true }).click();
  const png = await sharp({ create: { width: 64, height: 64, channels: 4, background: '#227744' } }).png().toBuffer();
  await editor.getByLabel('Chọn logo đội', { exact: true }).setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(editor.getByRole('img', { name: 'Xem trước logo đội' })).toBeVisible();
  await editor.getByRole('button', { name: 'Lưu ảnh', exact: true }).click();
  await expect(editor.getByRole('status')).toContainText('Đã lưu ảnh.');
  await expect(profile.getByRole('textbox', { name: 'Tên đội', exact: true })).toHaveValue('Aurora Updated');
  await profile.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
  await expect(profile.getByRole('heading', { name: 'Aurora Updated', exact: true })).toBeVisible();
  await expect(profile.getByRole('alert')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Aurora Updated', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Aurora Updated', exact: true })).toBeVisible();
  const image = page.getByRole('img', { name: 'Logo đội', exact: true });
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
});

test('profile schedule signals respect an earlier match elsewhere in the tournament', async ({ page, baseURL }) => {
  const { api, tournament, teams, matches } = await prepare(page, baseURL);
  await page.clock.setFixedTime(new Date('2026-10-05T08:00:00Z'));
  const own = matches.filter(match => match.status === 'ready' && match.teams.includes(teams[0].id));
  const earlier = matches.find(match => match.status === 'ready' && !match.teams.includes(teams[0].id));
  expect(own.length).toBeGreaterThan(0);
  expect(earlier).toBeTruthy();
  await api(`/tournaments/${tournament.id}/schedule`, {
    updates: [
      ...own.map(match => ({ matchId: match.id, revision: match.revision, scheduledAt: '2026-10-05T10:00:00Z' })),
      { matchId: earlier.id, revision: earlier.revision, scheduledAt: '2026-10-05T09:00:00Z' },
    ],
  });
  const profile = await openProfile(page);
  await profile.getByRole('combobox').selectOption(tournament.id);
  await expect(profile.getByRole('heading', { name: 'Danh sách đăng ký · 8 người', exact: true })).toBeVisible();
  await expect(profile.getByRole('button', { name: 'Xem trận', exact: true })).toHaveCount(own.length);
  await expect(profile.getByText(/Tiếp theo/)).toHaveCount(0);

  // Check the positive case as well: dropping all signals must fail this test.
  const rival = teams.find(team => team.id === earlier.teams[0]);
  const rivalProfile = await openProfile(page, rival.name);
  await rivalProfile.getByRole('combobox').selectOption(tournament.id);
  await expect(rivalProfile.getByText('Tiếp theo', { exact: true })).toHaveCount(1);
  await rivalProfile.getByRole('button', { name: 'Xem trận', exact: true }).first().click();
  const earlierCard = page.getByRole('button', { name: new RegExp(`^Vòng bảng · ${earlier.key} · BO1`) });
  await expect(earlierCard.getByText('Tiếp theo', { exact: true })).toHaveCount(1);
  const laterCard = page.getByRole('button', { name: new RegExp(`^Vòng bảng · ${own[0].key} · BO1`) });
  await expect(laterCard.getByText(/Tiếp theo/)).toHaveCount(0);
});

test('opening match A again after selecting B returns to A and keeps the unsaved game draft', async ({ page, baseURL }) => {
  const { tournament, teams, matches } = await prepare(page, baseURL);
  const [a, b] = matches.filter(match => match.status === 'ready' && match.teams.includes(teams[0].id));
  expect(b).toBeTruthy();
  const profile = await openProfile(page);
  await profile.getByRole('combobox').selectOption(tournament.id);
  await profile.getByRole('button', { name: 'Xem trận', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: `Vòng bảng · ${a.key} · Game 1`, exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: /^Đội thắng/ }).selectOption(teams[0].id);
  await page.getByRole('button', { name: new RegExp(`^Vòng bảng · ${b.key} · BO1`) }).click();
  await expect(page.getByRole('heading', { name: `Vòng bảng · ${b.key} · Game 1`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hồ sơ · Aurora Esports', exact: true }).first().click();
  await expect(profile.getByRole('heading', { name: 'Aurora Esports', exact: true })).toBeVisible();
  await profile.getByRole('button', { name: 'Xem trận', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: `Vòng bảng · ${a.key} · Game 1`, exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: /^Đội thắng/ })).toHaveValue(teams[0].id);
});
