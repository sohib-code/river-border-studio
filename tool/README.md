# River & Border Studio — source

Private command-line tool used by the owner of the River & Border YouTube channel
(https://www.youtube.com/@RiverAndBorder) to publish and manage that channel's own videos.
It has a single user (the channel owner) and runs only on the owner's computer.

Uses YouTube API Services. By using it you agree to the YouTube Terms of Service:
https://www.youtube.com/t/terms · Google Privacy Policy: https://policies.google.com/privacy ·
Privacy policy of this tool: https://sohib-code.github.io/river-border-studio/privacy.html

## Requirements
- Node.js 18+ and `npm install googleapis`
- A Google Cloud OAuth client of type **Desktop app**, saved as `client_secret.json` next to the
  `tool` folder (never committed). OAuth tokens are stored locally in `token.json` (never committed).

## Scripts
| Script | API methods | Purpose |
|---|---|---|
| `auth.js` | Google OAuth 2.0 (loopback + PKCE) | One-time sign-in; saves `token.json` locally |
| `upload-video.js` | `videos.insert` (resumable), `thumbnails.set` | Upload a finished video with metadata, private or scheduled |
| `update-video.js` | `videos.list`, `videos.update`, `thumbnails.set` | Set title, description, chapters, tags, thumbnail |
| `channel-info.js` | `channels.list` (mine=true) | Show the authorized channel |

## Usage
```
node auth.js
node upload-video.js ./video.mp4 ./content/001 --privacy private
node upload-video.js ./video.mp4 ./content/001 --publish-at 2026-12-01T15:00:00Z
node update-video.js <videoId> ./content/001 --thumbnail
node channel-info.js
```
`./content/001/metadata.json` holds `title`, `description`, `tags`, `categoryId`,
`defaultLanguage`, `defaultAudioLanguage`, `madeForKids`; `thumbnail.png` is optional.

## Data handling
No server, no database, no third parties. Tokens and reports stay on the owner's computer;
reports are refreshed or deleted within 30 days. Access can be revoked at
https://security.google.com/settings/security/permissions.
