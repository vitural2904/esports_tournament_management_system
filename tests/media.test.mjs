import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { fixture, owner } from './helpers.mjs';

test('organizer uploads a real logo; normalized image survives restart without changing a historical registration', async t => {
  const f = await fixture(t), cookie = await owner(f);
  const team = (await f.request('/api/teams', { method:'POST', cookie, body:{name:'Media team',tag:'IMG'} })).body.team;
  const png = await sharp({create:{width:120,height:80,channels:4,background:{r:30,g:90,b:60,alpha:0.5}}}).png().toBuffer();
  const uploaded = await f.request(`/api/teams/${team.id}/media/logo`, { method:'POST', cookie, body:{revision:team.revision,data:png.toString('base64'),mime:'image/png',light:true,x:50,y:50} });
  assert.equal(uploaded.status,200);
  assert.ok(uploaded.body.asset.id);
  assert.equal(uploaded.body.asset.width,120);
  const oldEvent = (await f.request('/api/tournaments', {method:'POST',cookie,body:{name:'Old images'}})).body.tournament;
  await f.request(`/api/tournaments/${oldEvent.id}/registrations`, {method:'POST',cookie,body:{teamId:team.id,playerIds:[],revision:0}});
  const oldId = uploaded.body.asset.id;
  const changed = await f.request(`/api/teams/${team.id}/media/logo`, {method:'POST',cookie,body:{revision:uploaded.body.record.revision,data:png.toString('base64'),mime:'image/png',light:false,x:30,y:40}});
  assert.equal(changed.status,200);
  assert.notEqual(changed.body.asset.id,oldId);
  await f.restart();
  const current = (await f.request('/api/directory',{cookie})).body.teams.find(item=>item.id===team.id);
  assert.equal(current.media.logo.id,changed.body.asset.id);
  const stored = (await f.request(`/api/tournaments/${oldEvent.id}`,{cookie})).body.tournament;
  assert.equal(stored.registrations[0].team.media.logo.id,oldId);
});
