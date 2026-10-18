# 🎵 Tamil Song Finder, Downloader & Synced Lyrics

A modern, fully responsive music discovery, song download, and synchronized lyrics web application built using **React + Vite + JavaScript** and a **Node.js Express backend proxy**.

Designed with a premium dark Spotify-inspired aesthetic, vibrant cyan/violet gradients, and subtle glassmorphism. Optimized for mobile phones, tablets, laptops, and desktop computers.

---

## ✨ Features

- **🔍 Smart Tamil Song Discovery**:
  - Search by song title, movie name, album name, singer, or music director (e.g. *Arabic Kuthu*, *Hukum*, *Vaathi Coming*, *Naatu Koothu*, *Leo*, *Jailer*, *Anirudh*, *A.R. Rahman*, *Yuvan Shankar Raja*, *Harris Jayaraj*, *Ilaiyaraaja*).
  - Multi-language support prioritizing Tamil and Indian music.
  - Recent searches history saved in browser `localStorage`.
  - Quick trending song chips for one-click discovery.

- **🎨 High-Resolution Song Artwork & Cover Download**:
  - Retrieves official cover art via authorized metadata integrations (iTunes API & JioSaavn).
  - Dynamically scaled to 600×600 and 500×500 high-definition square artwork.
  - **Direct Cover Download**: One-click download button that streams the high-resolution artwork as `Song - Cover.jpg` directly to the user's computer without redirects.

- **📋 Quick Copy Song & Artist Info**:
  - Instant one-click copy of formatted `"${SongTitle}" by ${Artist}` to clipboard.
  - Dedicated copy buttons next to the Song Title and Artist with animated confirmation.

- **⏱️ Synchronized Lyrics with Calibration (`https://lrclib.net`)**:
  - Live timestamped LRC lyrics synchronized to audio playback (`[mm:ss.xx]`).
  - **Timing Calibration & Offset Controls**: Interactive `+0.5s`, `-0.5s`, and `Reset` controls to nudge timing, plus **"Sync Here"** button on each lyric line to snap playback directly to that line.
  - Highlights active lyric lines in real time using HTML5 Audio `currentTime` and `timeupdate` events with 150ms vocal attack anticipation.
  - Karaoke-style line progress indicator showing real-time singing completion.
  - Smooth auto-scrolling with user-scroll detection.
  - **Interactive Seek**: Click any lyric line to jump the audio player directly to that timestamp.
  - **Network Resilience**: Automatic retry with backoff, in-memory cache, and verified fallback archive for iconic Tamil songs when LRCLIB returns 503 (Server Overloaded).
  - Custom lyrics upload/paste tool to test user-provided `.lrc` files.

- **📥 Direct Backend Song Downloads (No External Redirects)**:
  - When clicking "Download Song" or downloading from any source card, the backend automatically streams the audio file directly as a native attachment (`.mp3`).
  - **Zero External Redirects**: Never redirects to third-party ad links, popups, or external web pages.
  - Fast, secure server-to-browser streaming via `/api/download/song`.

- **🎧 Built-in Audio Player**:
  - Play / Pause, Next track, Previous track.
  - Interactive scrub bar with hover timestamp and duration formatting.
  - Volume slider with mute/unmute toggle.
  - Repeat modes: *Off* → *Repeat All* → *Repeat One*.
  - Shuffle mode and interactive slide-out **Queue / Playlist Drawer**.
  - Keyboard shortcuts: `Space` (Play/Pause), `Shift + Right` (Next), `Shift + Left` (Prev), `M` (Mute).
  - Audio source transparency (indicates official high-bitrate preview or direct stream).

- **📥 Modular Download & Source Search Links**:
  - Modular integration for the 4 requested websites:
    - [Masstamilan](https://www.masstamilan.dev)
    - [Mp3chetta](https://mp3chetta.com)
    - [Koshalworld](https://koshalworld.com)
    - [Pagalnew](https://pagalnew.com)
  - Official licensed platforms:
    - [Spotify](https://open.spotify.com)
    - [Apple Music](https://music.apple.com)
    - [JioSaavn](https://www.jiosaavn.com)
    - [YouTube Music](https://music.youtube.com)
  - Displays matching song title, movie/album, verified audio quality (320 Kbps / Lossless / 128 Kbps), source badges, and verified search links.
  - Legal compliance: Does not bypass CAPTCHAs, paywalls, or bot protections, and never fabricates download links.

---

## 🛠️ Technology Stack

- **Frontend**:
  - React 19
  - Vite 8
  - Tailwind CSS & Custom Modern Responsive CSS
  - Lucide React Icons
  - Axios

- **Backend**:
  - Node.js & Express 4
  - In-memory caching with TTL
  - Server-side API proxy to avoid CORS and protect credentials
  - Cheerio & Axios for modular search provider probes

---

## 📁 Project Structure

```text
Musicfinder/
├── dist/                      # Production build assets
├── public/                    # Static assets & favicon
├── server/
│   ├── data/
│   │   └── fallbackLyrics.js  # Verified LRC lyrics archive for top Tamil songs
│   ├── routes/
│   │   ├── songs.js           # Music metadata search (iTunes IN & JioSaavn)
│   │   ├── lyrics.js          # LRCLIB API client with retry and caching
│   │   └── sources.js         # Modular search providers (Masstamilan, Mp3chetta, etc.)
│   └── server.js              # Express API server & static SPA host
├── src/
│   ├── assets/                # App assets & images
│   ├── components/
│   │   ├── DownloadSources.jsx # Source links and quality cards
│   │   ├── ErrorMessage.jsx   # Error banner with retry
│   │   ├── Loading.jsx        # Skeleton loaders
│   │   ├── MusicPlayer.jsx    # Persistent audio player & queue drawer
│   │   ├── Navbar.jsx         # Header & logo
│   │   ├── SearchBar.jsx      # Search input with chips & recent searches
│   │   ├── SearchResults.jsx  # Song grid with sorting
│   │   ├── SongCard.jsx       # Music card with square artwork
│   │   ├── SongDetails.jsx    # Selected track metadata & actions
│   │   └── SyncedLyrics.jsx   # Timestamped lyrics with click-to-seek
│   ├── hooks/
│   │   ├── useAudioPlayer.js  # Audio element lifecycle, queue, repeat/shuffle
│   │   └── useSyncedLyrics.js # Lyric line matching and auto-scroll logic
│   ├── pages/
│   │   └── Home.jsx           # Main page layout & state orchestration
│   ├── services/
│   │   ├── downloadSources.js # API client for sources
│   │   ├── lyricsService.js   # API client for LRCLIB lyrics
│   │   └── musicMetadata.js   # API client for songs
│   ├── utils/
│   │   ├── formatTime.js      # mm:ss time formatting
│   │   ├── matchSong.js       # Title extraction & relevance scoring
│   │   └── parseLrc.js        # [mm:ss.xx] LRC timestamp parser
│   ├── App.jsx                # Application root
│   ├── index.css              # Custom styling & scrollbar
│   └── main.jsx               # React DOM entry
├── .env                       # Local environment variables
├── .env.example               # Environment template
├── package.json               # Dependencies and scripts
├── vite.config.js             # Vite configuration with proxy to port 5000
└── README.md                  # Complete documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

1. Clone or open the repository:
   ```bash
   cd Musicfinder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file from `.env.example`:
   ```env
   PORT=5000
   LRCLIB_USER_AGENT=TamilMusicFinder/1.0 (https://github.com/tamil-music-finder)
   ```

---

## 💻 Running Locally

### Option A: Development Mode (Vite + Express Proxy)

In development, run the Express backend on port `5000` and Vite dev server on port `5173`:

1. **Start the backend server**:
   ```bash
   npm run server
   ```

2. **In a second terminal, start the Vite frontend**:
   ```bash
   npm run dev
   ```

3. Open your browser at `http://localhost:5173`. Vite will automatically proxy all `/api/*` requests to the Express server on port 5000.

---

### Option B: Full-Stack Production Mode

Build the frontend and run the Express server which serves both the API and production static files:

1. **Build the frontend**:
   ```bash
   npm run build
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. Open `http://localhost:5000` in your browser.

---

## 📡 API Reference

### 1. Song Search
```http
GET /api/songs/search?q=arabic+kuthu&limit=20
```
**Response**:
```json
{
  "query": "arabic kuthu",
  "count": 2,
  "results": [
    {
      "id": "itunes-1610478703",
      "title": "Arabic Kuthu (From \"Beast\")",
      "artist": "Anirudh Ravichander & Jonita Gandhi",
      "musicDirector": "Anirudh Ravichander",
      "album": "Arabic Kuthu (From \"Beast\") - Single",
      "duration": 280,
      "durationFormatted": "4:40",
      "artworkUrl": "https://is1-ssl.mzstatic.com/.../600x600bb.jpg",
      "audioUrl": "https://audio-ssl.itunes.apple.com/...aac.p.m4a",
      "source": "iTunes Music"
    }
  ]
}
```

### 2. Synchronized Lyrics
```http
GET /api/lyrics?track_name=Arabic+Kuthu&artist_name=Anirudh
```
**Response**:
```json
{
  "trackName": "Arabic Kuthu",
  "artistName": "Anirudh Ravichander",
  "syncedLyrics": "[00:14.50] Malama pitha pithadhey\n[00:16.80] Malama pithadhey\n[00:19.00] Halamithi habibo...",
  "plainLyrics": "...",
  "source": "LRCLIB (Official API)"
}
```

### 3. Download & Streaming Sources
```http
GET /api/sources?title=Arabic+Kuthu&artist=Anirudh&album=Beast
```
**Response**:
```json
{
  "communitySources": [
    {
      "id": "masstamilan",
      "providerName": "Masstamilan",
      "matchingTitle": "Arabic Kuthu",
      "movieOrAlbum": "Beast",
      "audioQuality": "128 Kbps & 320 Kbps",
      "sourceUrl": "https://www.masstamilan.dev/search?keyword=Arabic%20Kuthu%20Beast",
      "hasDirectDownload": false
    }
  ],
  "officialSources": [
    {
      "id": "spotify",
      "providerName": "Spotify",
      "audioQuality": "Up to 320 Kbps Ogg Vorbis",
      "sourceUrl": "https://open.spotify.com/search/...",
      "badge": "Official Licensed Stream"
    }
  ]
}
```

---

## ⚖️ Legal & Compliance Notice

- This software provides music discovery, lyrics synchronization, and links to public search directories and authorized streaming providers.
- Direct downloads are strictly provided only when authorized and legally permissible by the rights holders.
- All music trademarks, song titles, album artwork, and audio files are the property of their respective artists, publishers, and record labels.
