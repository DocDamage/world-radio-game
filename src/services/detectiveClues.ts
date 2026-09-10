import type { RadioStation } from '../types';
import type { MissionScenario } from '../missions/types';

/**
 * Dynamically generates an immersive forensic dispatch briefing for Radio Detective
 * based on the target station's characteristics and active mission scenario.
 * 
 * Guarantees mystery isolation: Never leaks the target city or country name.
 */
export function generateDetectiveClue(
  station: RadioStation,
  scenario?: MissionScenario | null
): string {
  const parts: string[] = [];

  // 1. Latitude / Climate band
  const lat = station.geo_lat;
  let latDesc = 'temperate zone';
  if (lat > 55) {
    latDesc = 'sub-arctic high-latitude region';
  } else if (lat > 35) {
    latDesc = 'northern temperate zone';
  } else if (lat > 15) {
    latDesc = 'subtropical northern belt';
  } else if (lat >= -15 && lat <= 15) {
    latDesc = 'tropical equatorial belt';
  } else if (lat >= -35) {
    latDesc = 'southern subtropical zone';
  } else {
    latDesc = 'southern temperate latitudes';
  }

  // 2. Longitude sector
  const lng = station.geo_long;
  let lngDesc = 'global meridian';
  if (lng >= -170 && lng < -100) {
    lngDesc = 'Pacific Americas meridian';
  } else if (lng >= -100 && lng < -35) {
    lngDesc = 'Atlantic Americas longitude';
  } else if (lng >= -35 && lng < 15) {
    lngDesc = 'Western European / Atlantic corridor';
  } else if (lng >= 15 && lng < 45) {
    lngDesc = 'Central European / Mediterranean meridian';
  } else if (lng >= 45 && lng < 95) {
    lngDesc = 'West & South Asian continental sector';
  } else if (lng >= 95 && lng < 150) {
    lngDesc = 'East Asian & Australasian longitude';
  } else {
    lngDesc = 'Pacific oceanic meridian';
  }

  parts.push(`Intercept telemetry points to an active transmitter in the ${latDesc} along the ${lngDesc}.`);

  // 3. Carrier audio signal specs
  const codec = (station.codec || 'MP3').toUpperCase();
  const bitrate = station.bitrate ? `${station.bitrate} kbps` : 'variable rate';
  parts.push(`Carrier stream is encoded via a ${codec} modulation layer at ${bitrate}.`);

  // 4. Acoustic profiling from sanitized tags
  if (station.tags) {
    const forbidden = new Set([
      (station.place || '').toLowerCase(),
      (station.country || '').toLowerCase(),
      'city',
      'capital'
    ]);

    const sanitizedTags = station.tags
      .split(/[,;/]/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 2 && !forbidden.has(t))
      .slice(0, 3);

    if (sanitizedTags.length > 0) {
      parts.push(`Acoustic monitoring isolates signature [${sanitizedTags.join(', ')}] broadcast frequencies.`);
    }
  }

  // 5. Scenario clue focus
  if (scenario?.clueFocus === 'grid') {
    parts.push('Forensic lead: Prioritize municipal utility grid frequency, traffic direction, and transit infrastructure in the view.');
  } else if (scenario?.clueFocus === 'cultural') {
    parts.push('Forensic lead: Prioritize storefront typography, linguistic phonemes, and regional architectural styling.');
  } else {
    parts.push('Forensic lead: Triangulate street signage, architectural masonry, and environmental foliage to pinpoint the city.');
  }

  return parts.join(' ');
}
