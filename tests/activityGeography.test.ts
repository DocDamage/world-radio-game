import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLocationEnvironment, getCityMarketItems } from '../src/services/activityData.ts';

test('curated river rules match specific cities without country-wide pollution', () => {
  const venice = resolveLocationEnvironment('Venice', 'Italy');
  assert.equal(venice.biome, 'river');
  assert.match(venice.waterwayName || '', /Grand Canal/i);

  const rome = resolveLocationEnvironment('Rome', 'Italy');
  assert.equal(rome.biome, 'river');
  assert.match(rome.waterwayName || '', /Tiber/i);

  // Milan does not inherit Venice's Grand Canal or Rome's Tiber
  const milan = resolveLocationEnvironment('Milan', 'Italy');
  assert.notEqual(milan.waterwayName, 'Grand Canal & Venetian Lagoon');
  assert.notEqual(milan.waterwayName, 'Tiber River');
});

test('market items in Paris are distinct from other cities in France', () => {
  const parisMarket = getCityMarketItems('Paris', 'France');
  assert.equal(parisMarket.marketName, 'Marché aux Puces de Saint-Ouen');
  assert.ok(parisMarket.items.some(i => i.id === 'paris-croissant'));

  const lyonMarket = getCityMarketItems('Lyon', 'France');
  assert.notEqual(lyonMarket.marketName, 'Marché aux Puces de Saint-Ouen');
  assert.equal(lyonMarket.marketName, 'Marché Artisanal de Lyon');
  assert.ok(lyonMarket.items.some(i => i.id === 'fr-fromage'));
});

test('market items in New York City are distinct from other US cities', () => {
  const nycMarket = getCityMarketItems('New York', 'United States');
  assert.equal(nycMarket.marketName, 'Greenwich Village Flea & Deli');
  assert.ok(nycMarket.items.some(i => i.id === 'ny-bagel'));

  const chicagoMarket = getCityMarketItems('Chicago', 'United States');
  assert.notEqual(chicagoMarket.marketName, 'Greenwich Village Flea & Deli');
  assert.equal(chicagoMarket.marketName, 'Chicago Heritage Farmers Market');
  assert.ok(chicagoMarket.items.some(i => i.id === 'us-cider'));
});

test('market items in London are distinct from other UK cities', () => {
  const londonMarket = getCityMarketItems('London', 'United Kingdom');
  assert.equal(londonMarket.marketName, 'Borough Market & Portobello Crates');

  const edinburghMarket = getCityMarketItems('Edinburgh', 'United Kingdom');
  assert.notEqual(edinburghMarket.marketName, 'Borough Market & Portobello Crates');
  assert.equal(edinburghMarket.marketName, 'Edinburgh Town Fair');
});

test('market items in Tokyo are distinct from other Japanese cities', () => {
  const tokyoMarket = getCityMarketItems('Tokyo', 'Japan');
  assert.equal(tokyoMarket.marketName, 'Tsukiji & Shibuya Street Bazaar');

  const kyotoMarket = getCityMarketItems('Kyoto', 'Japan');
  assert.notEqual(kyotoMarket.marketName, 'Tsukiji & Shibuya Street Bazaar');
  assert.equal(kyotoMarket.marketName, 'Kyoto Shotengai Market');
});
