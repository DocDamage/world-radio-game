import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDetectiveClue } from '../src/services/detectiveClues.ts';
import type { RadioStation } from '../src/types.ts';
import type { MissionScenario } from '../src/missions/types.ts';

const mockParisStation: RadioStation = {
  id: 'paris-jazz-101',
  name: 'Jazz Paris FM',
  place: 'Paris',
  country: 'France',
  streamUrl: 'https://example.com/stream.mp3',
  geo_lat: 48.8566,
  geo_long: 2.3522,
  tags: 'jazz, classics, news',
  codec: 'MP3',
  bitrate: 192
};

const mockSydneyStation: RadioStation = {
  id: 'sydney-surf-102',
  name: 'Bondi Beats',
  place: 'Sydney',
  country: 'Australia',
  streamUrl: 'https://example.com/sydney.aac',
  geo_lat: -33.8688,
  geo_long: 151.2093,
  tags: 'electronic, dance, sydney, coastal',
  codec: 'AAC',
  bitrate: 256
};

test('generateDetectiveClue strictly protects mystery isolation (never contains city or country name)', () => {
  const clue1 = generateDetectiveClue(mockParisStation);
  assert.equal(clue1.toLowerCase().includes('paris'), false);
  assert.equal(clue1.toLowerCase().includes('france'), false);

  const clue2 = generateDetectiveClue(mockSydneyStation);
  assert.equal(clue2.toLowerCase().includes('sydney'), false);
  assert.equal(clue2.toLowerCase().includes('australia'), false);
});

test('generateDetectiveClue adapts to latitude band and longitude meridian', () => {
  const parisClue = generateDetectiveClue(mockParisStation);
  assert.match(parisClue, /northern temperate zone/i);
  assert.match(parisClue, /Western European \/ Atlantic corridor/i);
  assert.match(parisClue, /MP3/i);
  assert.match(parisClue, /192 kbps/i);

  const sydneyClue = generateDetectiveClue(mockSydneyStation);
  assert.match(sydneyClue, /southern subtropical zone/i);
  assert.match(sydneyClue, /Pacific oceanic meridian/i);
  assert.match(sydneyClue, /AAC/i);
});

test('generateDetectiveClue highlights scenario clue focus', () => {
  const gridScenario: Partial<MissionScenario> = { clueFocus: 'grid' };
  const clueGrid = generateDetectiveClue(mockParisStation, gridScenario as MissionScenario);
  assert.match(clueGrid, /utility grid frequency/i);

  const culturalScenario: Partial<MissionScenario> = { clueFocus: 'cultural' };
  const clueCultural = generateDetectiveClue(mockParisStation, culturalScenario as MissionScenario);
  assert.match(clueCultural, /storefront typography/i);
});
