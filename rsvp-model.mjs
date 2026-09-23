import { normalizeName } from "./rsvp-identity.mjs";

export const eventIds = ["haldi", "sangeet", "wedding"];
export const maxGuests = 100;

export function validateRsvp(input) {
  const fail = (code) => { throw new Error(code); };
  if (!input || !Array.isArray(input.guests) || !input.guests.length || input.guests.length > maxGuests)
    fail("invalidGuests");
  const names = new Set();
  const guests = input.guests.map((guest) => {
    if (!guest || typeof guest.name !== "string") fail("invalidName");
    const name = guest.name.normalize("NFKC").trim().replace(/\s+/gu, " ");
    if (!name || [...name].length > 200 || /[\u0000-\u001f\u007f]/u.test(name)) fail("invalidName");
    const key = normalizeName(name);
    if (names.has(key)) fail("repeatedName");
    names.add(key);
    if (typeof guest.attending !== "boolean") fail("invalidAttendance");
    if (!Array.isArray(guest.events) || guest.events.some((id) => !eventIds.includes(id)) || new Set(guest.events).size !== guest.events.length)
      fail("invalidEvents");
    const events = eventIds.filter((id) => guest.events.includes(id));
    if (guest.attending ? !events.length : events.length) fail("invalidEvents");
    return { name, attending: guest.attending, events };
  });
  if (typeof input.song !== "string" || [...input.song].length > 2000) fail("invalidSong");
  if (typeof input.email !== "string" || input.email.length > 254 || /[,;<>():"]/u.test(input.email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(input.email.trim())) fail("invalidEmail");
  return { guests, song: input.song.trim(), email: input.email.trim().toLowerCase() };
}

export function rsvpCounts(guests) {
  return {
    namedGuests: guests.length,
    attendingGuests: guests.filter((guest) => guest.attending).length,
    plusOnes: guests.slice(1).filter((guest) => guest.attending).length,
    events: Object.fromEntries(eventIds.map((id) => [id, guests.filter((guest) => guest.events.includes(id)).length])),
  };
}

// A stable, anonymous request key allows a lost response to be retried safely.
export async function createRequestKey(data, subtle = globalThis.crypto.subtle) {
  const hash = await subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(data)));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
