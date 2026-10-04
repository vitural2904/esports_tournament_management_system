import { test as base, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preview } from 'vite';
import { createApplication } from '../../server/application.mjs';
import { createPreset } from '../../shared/format.mjs';

// Each test gets a real API, a new database and the built UI on random ports.
// Never reuse the operator's running app or DATABASE_PATH.
export const test = base.extend({
  baseURL: async ({}, use) => {
    const directory = await mkdtemp(join(tmpdir(), 'bracket-ui-'));
    const allowedOrigins = [];
    let app, ui;
    try {
      app = await createApplication({ databasePath: join(directory, 'test.sqlite'), allowedOrigins });
      await new Promise((resolve, reject) => {
        app.server.once('error', reject);
        app.server.listen(0, '127.0.0.1', resolve);
      });
      ui = await preview({
        configFile: false,
        preview: {
          host: '127.0.0.1', port: 0, strictPort: true,
          proxy: { '/api': `http://127.0.0.1:${app.server.address().port}` },
        },
      });
      const origin = `http://127.0.0.1:${ui.httpServer.address().port}`;
      allowedOrigins.push(origin);
      await use(origin);
    } finally {
      if (ui) await new Promise((resolve, reject) => ui.httpServer.close(error => error ? reject(error) : resolve()));
      if (app) await app.close();
      await rm(directory, { recursive: true, force: true });
    }
  },
});
export { expect };

export function apiClient(page, origin) {
  return async function api(path, body) {
    const response = body === undefined
      ? await page.request.get(`/api${path}`)
      : await page.request.post(`/api${path}`, { data: body, headers: { Origin: origin } });
    expect(response.ok(), `${path}: ${await response.text()}`).toBeTruthy();
    return response.json();
  };
}

export async function prepare(page, origin) {
  const api = apiClient(page, origin);
  await api('/setup', { username: 'ui-owner', displayName: 'UI Owner', password: 'Temporary-UI-Test-Password-42!' });
  const { tournament } = await api('/tournaments', { name: 'UI Regression Cup' });
  const teams = [];
  for (let index = 0; index < 8; index++) {
    const { team } = await api('/teams', { name: index === 0 ? 'Aurora Esports' : `Rival ${index}`, tag: `T${index}` });
    teams.push(team);
    const playerIds = [];
    for (let member = 0; member < (index === 0 ? 8 : 1); member++) {
      const { player } = await api('/players', { handle: `Player-${index}-${member}` });
      playerIds.push(player.id);
    }
    await api(`/tournaments/${tournament.id}/registrations`, { teamId: team.id, playerIds, revision: 0 });
  }
  const current = (await api(`/tournaments/${tournament.id}`)).tournament;
  const saved = (await api(`/tournaments/${tournament.id}/format`, {
    revision: current.revision, format: createPreset('demo', teams.map(team => team.id)),
  })).tournament;
  await api(`/tournaments/${tournament.id}/lock`, { revision: saved.revision });
  const { matches } = await api(`/tournaments/${tournament.id}/matches`);
  return { api, tournament, teams, matches };
}

export async function openProfile(page, name = 'Aurora Esports') {
  await page.goto('/?app=operations&view=directory');
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  return page.getByRole('region', { name: 'Hồ sơ đội', exact: true });
}
