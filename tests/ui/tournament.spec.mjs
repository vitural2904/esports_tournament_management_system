import { test, expect, apiClient } from './fixtures.mjs';

test('organizer creates, registers, locks, schedules and completes a four-team tournament through the UI', async ({ page, baseURL }) => {
  test.setTimeout(60_000);
  const api = apiClient(page, baseURL);
  // Only account and directory setup use the API. Tournament writes all use UI.
  await api('/setup', { username: 'cup-owner', displayName: 'Cup Owner', password: 'Temporary-Cup-Test-Password-42!' });
  const teams = [];
  for (let index = 1; index <= 4; index++) {
    const { team } = await api('/teams', { name: `Cup Team ${index}`, tag: `C${index}` });
    const handles = [];
    for (let member = 1; member <= 5; member++) {
      const handle = `Runner-${index}-${member}`;
      await api('/players', { handle });
      handles.push(handle);
    }
    teams.push({ ...team, handles });
  }

  await test.step('Create tournament and register four teams with five players each', async () => {
    await page.goto('/?app=operations');
    await page.getByRole('button', { name: 'Tạo giải', exact: true }).click();
    await page.getByRole('textbox', { name: 'Tên giải', exact: true }).fill('Full Flow Cup');
    await page.getByRole('button', { name: 'Tạo giải', exact: true }).last().click();
    await page.getByRole('button', { name: /Full Flow Cup.*0 đội/ }).click();
    await page.getByRole('button', { name: 'Quản lý đăng ký', exact: true }).click();
    for (const team of teams) {
      await page.getByRole('button', { name: 'Đăng ký đội', exact: true }).click();
      await page.getByRole('combobox', { name: /^Đội đăng ký/ }).selectOption({ label: team.name });
      for (const handle of team.handles) await page.getByRole('checkbox', { name: handle, exact: true }).check();
      await page.getByRole('button', { name: 'Lưu đăng ký', exact: true }).click();
      await expect(page.getByRole('status')).toContainText('Đã lưu đăng ký của đội.');
      const registration = page.getByRole('article').filter({ has: page.getByRole('button', { name: team.name, exact: true }) });
      for (const handle of team.handles) await expect(registration).toContainText(handle);
    }
  });

  await test.step('Save and lock a three-match BO1 bracket', async () => {
    await page.getByRole('button', { name: 'Thể thức', exact: true }).click();
    const builder = page.getByRole('region', { name: 'Dựng thể thức giải', exact: true });
    await builder.getByRole('button', { name: 'Loại trực tiếp', exact: true }).first().click();
    await builder.getByRole('combobox', { name: /^BO mặc định/ }).selectOption('1');
    await builder.getByRole('combobox', { name: /^BO chung kết/ }).selectOption('1');
    await builder.getByRole('button', { name: 'Lưu thể thức', exact: true }).click();
    await expect(builder.getByRole('button', { name: 'Chốt một lần', exact: true })).toBeEnabled();
    await builder.getByRole('button', { name: 'Chốt một lần', exact: true }).click();
    await expect(builder).toContainText('Đã chốt · cấu trúc được khóa');
    await expect(builder.getByRole('button', { name: 'Lưu thể thức', exact: true })).toHaveCount(0);
    await expect(builder.getByRole('combobox', { name: /^BO mặc định/ })).toBeDisabled();
    await page.getByRole('button', { name: 'Trận đấu', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Vận hành trận đấu', exact: true }).getByRole('button', { name: /^Loại trực tiếp · U[123] · BO1/ })).toHaveCount(3);
  });

  const operations = page.getByRole('region', { name: 'Vận hành trận đấu', exact: true });
  const card = key => operations.getByRole('button', { name: new RegExp(`^Loại trực tiếp · ${key} · BO1`) });
  const gameHeading = key => page.getByRole('heading', { name: `Loại trực tiếp · ${key} · Game 1`, exact: true });

  await test.step('Schedule the first semifinal and verify stored local time', async () => {
    await operations.getByText('Đặt lịch · 0 trận đã chọn', { exact: true }).click();
    await operations.getByRole('checkbox', { name: /^Chọn lịch Loại trực tiếp · U1 ·/ }).check();
    await operations.getByLabel('Ngày giờ trận đầu', { exact: true }).fill('2030-10-05T15:00');
    await operations.getByRole('button', { name: 'Lưu lịch', exact: true }).click();
    await expect(operations.getByRole('status')).toContainText('Đã lưu lịch.');
    await expect(card('U1').locator('time')).toHaveAttribute('datetime', '2030-10-05T08:00:00.000Z');
  });

  async function finish(key, winner) {
    await card(key).click();
    await expect(gameHeading(key)).toBeVisible();
    await operations.getByRole('combobox', { name: /^Đội thắng/ }).selectOption({ label: winner });
    await operations.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
    await expect(operations.getByRole('status')).toContainText('Đã lưu nháp.');
    await expect(card(key).getByText('0', { exact: true })).toHaveCount(2);
    await operations.getByRole('button', { name: 'Gửi kết quả', exact: true }).click();
    await expect(operations.getByRole('status')).toContainText('Đã gửi game.');
    await expect(card(key).getByText('0', { exact: true })).toHaveCount(2);
    await expect(card(key)).toContainText('Chờ xác nhận');
    if (key !== 'U3') await expect(card('U3')).not.toContainText(winner);
    await expect(page.getByRole('heading', { name: /^Nhà vô địch ·/ })).toHaveCount(0);
    await operations.getByRole('button', { name: 'Xác nhận game', exact: true }).click();
    await expect(operations.getByRole('status').filter({ hasText: 'Đã xác nhận.' })).toBeVisible();
    await expect(card(key)).toContainText('Hoàn tất');
    await expect(card(key).getByText('1', { exact: true })).toHaveCount(1);
  }

  await test.step('Confirm semifinals and verify finalists advance only after confirmation', async () => {
    await finish('U1', 'Cup Team 1');
    await expect(card('U3')).toContainText('Cup Team 1');
    await expect(card('U3')).toContainText('Chờ đủ điều kiện');
    await finish('U2', 'Cup Team 3');
    await expect(card('U3')).toContainText('Cup Team 3');
    await expect(card('U3')).toContainText('Sẵn sàng');
  });

  await test.step('Confirm final, show champion and retain results after reload', async () => {
    await finish('U3', 'Cup Team 1');
    await expect(page.getByRole('heading', { name: 'Nhà vô địch · Cup Team 1', exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: /Full Flow Cup.*4 đội/ }).click();
    await page.getByRole('button', { name: 'Xem trận đấu', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nhà vô địch · Cup Team 1', exact: true })).toBeVisible();
    for (const key of ['U1', 'U2', 'U3']) await expect(card(key)).toContainText('Hoàn tất');
    await expect(card('U1').locator('time')).toHaveAttribute('datetime', '2030-10-05T08:00:00.000Z');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
