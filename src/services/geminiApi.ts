// Google Gemini API integration for Local Guide, Detective Clues, and Cultural Commentary

export async function askGeminiGuide(
  apiKey: string,
  cityName: string,
  countryName: string,
  stationName: string,
  genre: string,
  mode: 'guide' | 'scavenger' | 'mystery_clue' | 'trivia'
): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    return getDefaultGuideResponse(cityName, countryName, stationName, mode);
  }

  let prompt = '';
  switch (mode) {
    case 'guide':
      prompt = `You are a lively, friendly local resident and tour guide living in ${cityName}, ${countryName}. 
The user is currently walking your neighborhood streets while listening to the local radio station "${stationName}" (genre: ${genre}).
In 2-3 engaging, conversational sentences, tell the listener what life feels like right now on these streets, a signature local street food they should grab, and what makes the local neighborhood vibe unique. Be charming and authentic.`;
      break;

    case 'scavenger':
      prompt = `You are designing a street-level walking scavenger hunt in ${cityName}, ${countryName}.
Give the player 1 specific architectural or cultural landmark, shop sign, or street feature typically found around this neighborhood to find. Keep it brief (under 50 words), intriguing, and fun.`;
      break;

    case 'mystery_clue':
      prompt = `You are the host of a Radio Detective mystery game. The secret location is ${cityName}, ${countryName}. 
Give a clever, cryptic riddle or clue (2 sentences max) based on the local climate, language, famous food, or geography WITHOUT naming the city or country directly.`;
      break;

    case 'trivia':
      prompt = `Share one fascinating, little-known piece of local history or musical trivia about ${cityName}, ${countryName} and its broadcasting or music culture in 2 sentences.`;
      break;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 200
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || getDefaultGuideResponse(cityName, countryName, stationName, mode);
  } catch (error) {
    console.warn('Gemini API call failed, falling back to local guide knowledge:', error);
    return getDefaultGuideResponse(cityName, countryName, stationName, mode);
  }
}

function getDefaultGuideResponse(
  cityName: string,
  countryName: string,
  stationName: string,
  mode: string
): string {
  switch (mode) {
    case 'mystery_clue':
      return `Listen closely to the broadcast rhythm and watch the road signs. Notice the direction of the sunlight and the architectural silhouettes around the transmitter.`;
    case 'scavenger':
      return `Look around for the highest rooftop antenna, a local street café awning, or a public transit sign near the corner.`;
    case 'trivia':
      return `${cityName} in ${countryName} has a rich sonic culture blending local folklore with international airwaves. Station "${stationName}" connects the heartbeat of this district.`;
    default:
      return `Welcome to the streets of ${cityName || 'the world'}, ${countryName}! You are tuned into ${stationName}. Take a stroll down the avenue, watch the neighborhood architecture, and soak in the local soundscape.`;
  }
}
