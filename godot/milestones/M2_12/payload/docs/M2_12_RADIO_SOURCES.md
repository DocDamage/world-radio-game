# M2.12 regional radio provenance

Reviewed on 2026-09-12. These records add discovery metadata; neither listed frequencies nor approximate city-center pins represent measured RF coverage. WYBCX is an Internet service. No logos, copyrighted recordings, or API credentials are bundled.

| ID | Display name | City used for discovery | Bundled playback | Publisher source |
|---|---|---|---|---|
| `ct-wybc-fm` | 94.3 WYBC | New Haven | Official website player | https://www.943wybc.com/ |
| `ct-wplr-fm` | 99.1 PLR | New Haven | Official website player | https://www.wplr.com/ |
| `ct-wnhh-lp` | WNHH 103.5 Community Radio | New Haven | Official website player | https://wnhh.org/ |
| `ct-wybcx` | WYBCX Yale Radio | New Haven | Official website player | https://www.wybc.com/info/about/ |
| `ct-wybc-am` | WSHU News & Talk / WYBC 1340 AM | New Haven | Official website player | https://www.wshu.org/how-to-tune-in |
| `ct-wnhu-fm` | 88.7 WNHU | West Haven | Official website player | https://www.newhaven.edu/student-life/get-involved/wnhu.php |
| `ct-wqaq-fm` | WQAQ 98.1 | Hamden | Official website player | https://epiprod.qu.edu/schools/communications/career-development/ |
| `ct-wkci-fm` | KC101 / WKCI 101.3 | Hamden | Official website player | https://kc101.iheart.com/ |
| `ct-wpkn-fm` | WPKN 89.5 Community Radio | Bridgeport | Direct publisher-linked URL | https://wpkn.org/listen-live/ |
| `ct-wshu-fm` | WSHU 91.1 News & Classical | Fairfield | Official website player | https://www.wshu.org/how-to-tune-in |
| `ct-wmnr-fm` | WMNR Fine Arts Radio | Monroe | Direct publisher-linked URL | https://www.wmnr.org/listen |
| `ct-wesu-fm` | WESU 88.1 | Middletown | Direct publisher-linked URL | https://www.wesufm.org/2026/07/30/new-live-stream-link-for-wesu-update-your-bookmarks/ |

## Direct endpoints

- WPKN 89.5 Community Radio: `https://ice25.securenetsystems.net/WPKN`; source: https://wpkn.org/listen-live/
- WMNR Fine Arts Radio: `https://wmnr.streamguys1.com/live`; source: https://www.wmnr.org/listen
- WESU 88.1: `https://listen.wesufm.org/stream`; source: https://www.wesufm.org/2026/07/30/new-live-stream-link-for-wesu-update-your-bookmarks/

WESU announced its new `https://listen.wesufm.org/stream` URL on July 30, 2026 and states the old URL is inactive. Publisher source: https://www.wesufm.org/2026/07/30/new-live-stream-link-for-wesu-update-your-bookmarks/

WMNR explicitly publishes its direct URL at https://www.wmnr.org/listen. WPKN links its direct Listen Live endpoint at https://wpkn.org/listen-live/. The checked date records a website review, not successful local audio playback.

## Optional directory refresh

API contract: https://api.radio-browser.info/. Mirror discovery/randomization, named User-Agent, bounded requests and conservative identity matching are implemented. The app deliberately does not reinterpret an HTML player as an audio stream. Native endpoints are saved only on a user-triggered successful lookup; existing imported endpoints retain priority. No precise device location, profile or favorites are sent. Network providers naturally receive connection metadata such as the IP address.

No container DNS access was available for an end-to-end public lookup or public stream decode. Mocked parsing, failed-result handling, cancellation serials, profile persistence, and real local audio decoding were tested separately. Incorrect/missing directory matches remain website-only rather than silently mapping to the wrong service.

## Known scope

Twelve local/regional entries are a deliberate supplement to the existing starter/import system, not a complete Connecticut or global directory. Broader discovery remains a later milestone. City-center coordinates can give multiple services the same 0 km distance; they are not transmitter locations.
