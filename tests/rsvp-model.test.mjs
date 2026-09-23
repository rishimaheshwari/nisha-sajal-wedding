import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRsvp, rsvpCounts, createRequestKey } from '../rsvp-model.mjs';
const reply = () => ({ guests: [
  { name: ' Test Guest One ', attending: true, events: ['wedding', 'haldi'] },
  { name: 'Test Guest Two', attending: true, events: ['wedding'] },
  { name: 'Test Guest Three', attending: false, events: [] },
], song: '  Example song  ', email: ' qa@example.com ' });
test('normalizes a mixed party and counts each event separately', () => {
  const data = validateRsvp(reply());
  assert.equal(data.guests[0].name, 'Test Guest One');
  assert.deepEqual(data.guests[0].events, ['haldi', 'wedding']);
  assert.equal(data.song, 'Example song');
  assert.deepEqual(rsvpCounts(data.guests), { namedGuests: 3, attendingGuests: 2, plusOnes: 1, events: { haldi: 1, sangeet: 0, wedding: 2 } });
});
test('requires names, attendance, and an event for attending guests', () => {
  for (const invalid of [
    { name: '  ', attending: true, events: ['haldi'] },
    { name: 'Test', attending: null, events: [] },
    { name: 'Test', attending: true, events: [] },
    { name: 'Test', attending: false, events: ['wedding'] },
    { name: 'Test', attending: true, events: ['unknown'] },
    { name: 'Test', attending: true, events: ['haldi', 'haldi'] },
    { name: 'Test', attending: true, events: 'haldi' },
  ]) assert.throws(() => validateRsvp({ guests: [invalid], song: '' }));
});
test('rejects duplicate names despite case, whitespace, and Unicode presentation', () => {
  const data = reply(); data.guests[1].name = 'ＴＥＳＴ  guest ONE';
  assert.throws(() => validateRsvp(data), /repeatedName/);
});
test('bounds party size and song length', () => {
  assert.throws(() => validateRsvp({ guests: [], song: '' }), /invalidGuests/);
  assert.throws(() => validateRsvp({ guests: Array(101).fill(reply().guests[0]), song: '' }), /invalidGuests/);
  const data = reply(); data.song = 'a'.repeat(2001);
  assert.throws(() => validateRsvp(data), /invalidSong/);
});
test('declining primary guest does not subtract from additional guests', () => {
  const data = reply(); data.guests[0].attending = false; data.guests[0].events = [];
  assert.equal(rsvpCounts(validateRsvp(data).guests).plusOnes, 1);
});
test('retries use a stable request key and changed choices get a new key', async () => {
  const a = validateRsvp(reply()), b = validateRsvp(reply());
  assert.equal(await createRequestKey(a), await createRequestKey(b));
  b.guests[1].events = ['sangeet'];
  assert.notEqual(await createRequestKey(a), await createRequestKey(b));
});

test('requires a contact email and includes it in retry identity', async () => {
  const data = reply(); data.email = 'not-an-email';
  assert.throws(() => validateRsvp(data), /invalidEmail/);
  const valid = validateRsvp(reply());
  assert.equal(valid.email, 'qa@example.com');
  assert.throws(() => validateRsvp({ ...valid, email: 'qa@example.com,other' }), /invalidEmail/);
  const changed = { ...valid, email: 'another@example.com' };
  assert.notEqual(await createRequestKey(valid), await createRequestKey(changed));
});
