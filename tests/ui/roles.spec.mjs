import { test, expect, apiClient } from './fixtures.mjs';

test('admin assigns global operator, referee and caster; result writes, corrections and read-only viewing enforce their roles', async ({ page: admin, browser, baseURL }, testInfo) => {
  test.setTimeout(60_000);
  const api = apiClient(admin, baseURL);
  const temporaryPassword = 'Temporary-Role-Test-Password-42!';
  const memberPassword = 'Changed-Role-Test-Password-42!';
  const ignoreHTTPSErrors = testInfo.project.name === 'production';
  const operatorContext = await browser.newContext({ baseURL, ignoreHTTPSErrors, timezoneId: 'Asia/Ho_Chi_Minh' });
  const entryContext = await browser.newContext({ baseURL, ignoreHTTPSErrors, timezoneId: 'Asia/Ho_Chi_Minh' });
  try {
    const operator = await operatorContext.newPage();
    const entry = await entryContext.newPage();
    if (ignoreHTTPSErrors) {
      expect(await (await admin.request.get('/api/setup')).json()).toEqual({ needed: false });
      expect((await admin.request.post('/api/setup', { data: { username: 'attacker', displayName: 'Other', password: temporaryPassword }, headers: { Origin: baseURL } })).status()).toBe(403);
      await api('/login', { username: 'role-admin', password: temporaryPassword });
      expect((await admin.context().cookies()).find(cookie => cookie.name === 'bracket_session').secure).toBe(true);
    } else await api('/setup', { username: 'role-admin', displayName: 'Role Admin', password: temporaryPassword });

    await test.step('Admin creates member accounts and grants one role per account through UI', async () => {
      await admin.goto('/?app=operations&view=accounts');
      const create = admin.getByRole('group', { name: 'Thành viên mới', exact: true });
      for (const [username, displayName] of [['cup-operator', 'Cup Operator'], ['cup-entry', 'Cup Referee'], ['cup-caster', 'Cup Caster']]) {
        await create.getByRole('textbox', { name: 'Tên hiển thị', exact: true }).fill(displayName);
        await create.getByRole('textbox', { name: 'Tên đăng nhập', exact: true }).fill(username);
        await create.getByRole('combobox', { name: 'Role', exact: true }).selectOption(username === 'cup-operator' ? 'operator' : username === 'cup-entry' ? 'referee' : 'caster');
        await create.getByLabel('Mật khẩu tạm', { exact: true }).fill(temporaryPassword);
        await create.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
        await expect(admin.getByRole('button', { name: `Quản lý ${username}`, exact: true })).toBeVisible();
      }
      await admin.getByRole('button', { name: 'Giải đấu', exact: true }).click();
      await admin.getByRole('button', { name: 'Tạo giải', exact: true }).click();
      await admin.getByRole('textbox', { name: 'Tên giải', exact: true }).fill('Roles Cup');
      await admin.getByRole('button', { name: 'Tạo giải', exact: true }).last().click();
      await admin.getByRole('button', { name: /Roles Cup.*0 đội/ }).click();
    });

    const { tournaments } = await api('/tournaments');
    const event = tournaments.find(item => item.name === 'Roles Cup');
    expect(event).toBeTruthy();
    const privateEvent = (await api('/tournaments', { name: 'Private Cup' })).tournament;


    const teams = [];
    // Directory and an ungranted event are fixtures. Preparation of Roles Cup uses UI.
    for (let index = 1; index <= 2; index++) {
      const { team } = await api('/teams', { name: `Role Team ${index}`, tag: `R${index}` });
      const handles = [];
      for (let member = 1; member <= 5; member++) {
        const handle = `Role-${index}-${member}`;
        await api('/players', { handle });
        handles.push(handle);
      }
      teams.push({ ...team, handles });
    }

    async function signIn(member, username) {
      await member.goto('/?app=operations');
      await member.getByRole('textbox', { name: 'Tên đăng nhập', exact: true }).fill(username);
      await member.getByLabel('Mật khẩu', { exact: true }).fill(temporaryPassword);
      await member.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await expect(member.getByRole('heading', { name: 'Đổi mật khẩu lần đầu', exact: true })).toBeVisible();
      await member.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(temporaryPassword);
      await member.getByLabel('Mật khẩu mới', { exact: true }).fill(memberPassword);
      await member.getByLabel('Nhập lại mật khẩu mới', { exact: true }).fill(memberPassword);
      await member.getByRole('button', { name: 'Lưu mật khẩu mới', exact: true }).click();
      await expect(member.getByRole('button', { name: /Roles Cup/ })).toBeVisible();
      await expect(member.getByRole('button', { name: /Private Cup/ })).toBeVisible();
      await expect(member.getByRole('button', { name: 'Tài khoản', exact: true })).toHaveCount(0);
      expect((await member.request.get(`/api/tournaments/${privateEvent.id}`)).status()).toBe(200);
      expect((await member.request.get('/api/users')).status()).toBe(403);
    }

    await test.step('Members sign in independently and change their temporary passwords', async () => {
      await signIn(operator, 'cup-operator');
      await signIn(entry, 'cup-entry');
    });

    await test.step('Operator registers teams, locks BO1 format and schedules the final', async () => {
      await operator.getByRole('button', { name: /Roles Cup.*0 đội/ }).click();
      await expect(operator.getByRole('button', { name: 'Phân quyền', exact: true })).toHaveCount(0);
      await operator.getByRole('button', { name: 'Quản lý đăng ký', exact: true }).click();
      for (const team of teams) {
        await operator.getByRole('button', { name: 'Đăng ký đội', exact: true }).click();
        await operator.getByRole('combobox', { name: /^Đội đăng ký/ }).selectOption({ label: team.name });
        for (const handle of team.handles) await operator.getByRole('checkbox', { name: handle, exact: true }).check();
        await operator.getByRole('button', { name: 'Lưu đăng ký', exact: true }).click();
        await expect(operator.getByRole('status').filter({ hasText: 'Đã lưu đăng ký của đội.' })).toBeVisible();
        await expect(operator.getByRole('button', { name: 'Lưu đăng ký', exact: true })).toBeEnabled();
      }
      await operator.getByRole('button', { name: 'Thể thức', exact: true }).click();
      const builder = operator.getByRole('region', { name: 'Dựng thể thức giải', exact: true });
      await builder.getByRole('button', { name: 'Loại trực tiếp', exact: true }).first().click();
      await builder.getByRole('combobox', { name: /^BO mặc định/ }).selectOption('1');
      await builder.getByRole('combobox', { name: /^BO chung kết/ }).selectOption('1');
      await builder.getByRole('button', { name: 'Lưu thể thức', exact: true }).click();
      await expect(builder.getByRole('button', { name: 'Chốt một lần', exact: true })).toBeEnabled();
      await builder.getByRole('button', { name: 'Chốt một lần', exact: true }).click();
      await expect(builder).toContainText('Đã chốt · cấu trúc được khóa');
      await operator.getByRole('button', { name: 'Trận đấu', exact: true }).click();
      await operator.getByText('Đặt lịch · 0 trận đã chọn', { exact: true }).click();
      await operator.getByRole('checkbox', { name: /^Chọn lịch Loại trực tiếp · U1 ·/ }).check();
      await operator.getByLabel('Ngày giờ trận đầu', { exact: true }).fill('2030-10-05T15:00');
      await operator.getByRole('button', { name: 'Lưu lịch', exact: true }).click();
      await expect(operator.getByRole('status').filter({ hasText: 'Đã lưu lịch.' })).toBeVisible();
      await expect(operator.getByRole('button', { name: 'Lưu nháp', exact: true })).toBeVisible();
      await expect(operator.getByRole('button', { name: 'Gửi kết quả', exact: true })).toBeVisible();
      await expect(operator.getByRole('combobox', { name: /^Đội thắng/ })).toBeEnabled();
    });

    const matchPath = `/api/tournaments/${event.id}/matches/stage1%3AU1/games/1`;
    async function denied(member, path, data) {
      const response = await member.request.post(path, { data, headers: { Origin: baseURL } });
      expect(response.status(), `${path}: ${await response.text()}`).toBe(403);
    }

    await test.step('Server denies cross-role writes even with valid requests', async () => {
      await denied(entry, `/api/tournaments/${event.id}/registrations`, { teamId: teams[0].id, playerIds: [], revision: 1 });
      const { matches } = await api(`/tournaments/${event.id}/matches`);
      await denied(entry, `/api/tournaments/${event.id}/schedule`, { updates: [{ matchId: matches[0].id, revision: matches[0].revision, scheduledAt: null }] });
      const after = (await api(`/tournaments/${event.id}/matches`)).matches[0];
      expect(after.games).toEqual([]);
      expect(after.scheduledAt).toBe('2030-10-05T08:00:00.000Z');
      expect((await api(`/tournaments/${event.id}`)).tournament.registrations.find(item => item.team.id === teams[0].id).players).toHaveLength(5);
    });

    await test.step('Entry saves and submits the game but cannot confirm it', async () => {
      await entry.reload();
      await entry.getByRole('button', { name: /Roles Cup/ }).click();
      await expect(entry.getByRole('button', { name: 'Lưu lịch', exact: true })).toHaveCount(0);
      await expect(entry.getByRole('button', { name: 'Lưu thể thức', exact: true })).toHaveCount(0);
      await expect(entry.getByRole('button', { name: 'Đăng ký đội', exact: true })).toHaveCount(0);
      await entry.getByRole('combobox', { name: /^Đội thắng/ }).selectOption({ label: 'Role Team 1' });
      await entry.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
      await expect(entry.getByRole('status').filter({ hasText: 'Đã lưu nháp.' })).toBeVisible();
      await entry.getByRole('button', { name: 'Gửi kết quả', exact: true }).click();
      await expect(entry.getByRole('status').filter({ hasText: 'Đã gửi game.' })).toBeVisible();
      await expect(entry.getByRole('button', { name: 'Xác nhận game', exact: true })).toBeVisible();
      const submitted = (await api(`/tournaments/${event.id}/matches`)).matches[0];
      expect(submitted.games[0].state).toBe('submitted');
      expect(submitted.score).toEqual([0, 0]);
      expect((await api(`/tournaments/${event.id}/matches`)).matches[0].games[0].state).toBe('submitted');
    });

    await test.step('Operator confirms and both member sessions show the same champion', async () => {
      await operator.getByRole('button', { name: 'Tải lại trận · bỏ phần chưa lưu', exact: true }).click();
      await entry.getByRole('button', { name: 'Xác nhận game', exact: true }).click();
      await operator.getByRole('button', { name: 'Tải lại trận · bỏ phần chưa lưu', exact: true }).click();
      await expect(operator.getByRole('heading', { name: 'Nhà vô địch · Role Team 1', exact: true })).toBeVisible();
      await entry.getByRole('button', { name: 'Tải lại trận · bỏ phần chưa lưu', exact: true }).click();
      await expect(entry.getByRole('button', { name: 'Sửa game đã xác nhận', exact: true })).toBeVisible();
      const completed = (await api(`/tournaments/${event.id}/matches`)).matches[0];
      expect(completed.games[0].state).toBe('confirmed');
      expect(completed.winnerId).toBe(teams[0].id);
      expect(completed.score).toEqual([1, 0]);
    });

    await test.step('Referee corrects the old confirmed game and refreshes its result', async () => {
      await entry.getByRole('button', { name: 'Sửa game đã xác nhận', exact: true }).click();
      await entry.getByRole('combobox', { name: /^Đội thắng/ }).selectOption({ label: 'Role Team 2' });
      await entry.getByRole('textbox', { name: 'Lý do', exact: true }).fill('Sửa kết quả cũ theo biên bản');
      await entry.getByRole('button', { name: 'Xem trước ảnh hưởng', exact: true }).click();
      await entry.getByRole('button', { name: 'Xác nhận lưu thay đổi', exact: true }).click();
      await expect(entry.getByRole('status').filter({ hasText: 'Đã lưu thay đổi và lịch sử.' })).toBeVisible();
      const corrected = (await api(`/tournaments/${event.id}/matches`)).matches[0];
      expect(corrected.winnerId).toBe(teams[1].id);
      await expect(entry.getByRole('button', { name: 'Sửa game đã xác nhận', exact: true })).toBeVisible();
    });

    await test.step('Caster sees progress and teams but no business write controls', async () => {
      const context = await browser.newContext({ baseURL, ignoreHTTPSErrors });
      try {
        const caster = await context.newPage();
        await signIn(caster, 'cup-caster');
        await caster.goto('/?app=operations&view=accounts');
        await expect(caster.getByRole('heading', { name: 'Cấp tài khoản', exact: true })).toHaveCount(0);
        await expect(caster.getByRole('button', { name: 'Tạo giải', exact: true })).toHaveCount(0);
        await caster.getByRole('button', { name: /Roles Cup/ }).click();
        await caster.getByRole('button', { name: 'Trận đấu', exact: true }).click();
        await expect(caster.getByRole('heading', { name: 'Nhà vô địch · Role Team 2', exact: true })).toBeVisible();
        for (const name of ['Lưu nháp', 'Gửi kết quả', 'Xác nhận game', 'Sửa game đã xác nhận']) await expect(caster.getByRole('button', { name, exact: true })).toHaveCount(0);
        await denied(caster, `${matchPath}/save`, { revision: 0, data: { winnerId: teams[0].id } });
        await caster.getByRole('button', { name: 'Danh bạ', exact: true }).click();
        await expect(caster.getByRole('button', { name: teams[0].name, exact: true })).toBeVisible();
        await expect(caster.getByRole('button', { name: 'Thêm đội', exact: true })).toHaveCount(0);
      } finally { await context.close(); }
    });
    await test.step('Admin changes referee role and revokes the signed-in session', async () => {
      await admin.goto('/?app=operations&view=accounts');
      await admin.getByRole('button', { name: 'Quản lý cup-entry', exact: true }).click();
      const details = admin.getByRole('group', { name: 'Thông tin tài khoản', exact: true });
      await details.getByRole('combobox', { name: 'Role', exact: true }).selectOption('caster');
      await details.getByRole('button', { name: 'Lưu tài khoản', exact: true }).click();
      await expect(admin.getByRole('status')).toContainText('Đã lưu tài khoản.');
      expect((await entry.request.get('/api/me')).status()).toBe(401);
      expect((await operator.request.get('/api/me')).status()).toBe(200);
    });
    if (ignoreHTTPSErrors) await test.step('Production proxy overwrites forged IP headers and keeps login limits in force', async () => {
      for (let index = 0; index < 10; index++) {
        const response = await admin.request.post('/api/login', { data: { username: 'role-admin', password: 'Wrong-Production-Password-42!' }, headers: { Origin: baseURL, 'X-Bracket-Client-IP': `192.0.2.${index + 1}`, 'CF-Connecting-IP': `192.0.2.${index + 20}`, 'X-Forwarded-For': `192.0.2.${index + 40}` } });
        expect(response.status()).toBe(401);
      }
      expect((await admin.request.post('/api/login', { data: { username: 'role-admin', password: temporaryPassword }, headers: { Origin: baseURL, 'X-Bracket-Client-IP': '192.0.2.99' } })).status()).toBe(429);
    });
  } finally {
    await operatorContext.close();
    await entryContext.close();
  }
});
