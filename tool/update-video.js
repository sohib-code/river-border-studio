// Applies metadata.json (title, description, tags, category, language, made-for-kids)
// and optionally a thumbnail to an already uploaded video.
// Usage: node scripts/update-video.js <videoId|url> <content-folder> [--thumbnail]
// Note: uploads from this unaudited API project would be locked to private, so videos
// are uploaded by hand in Studio; this script only edits them (allowed without audit).
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { getAuthorizedClient } = require('./lib/auth');

const [idArg, dir] = process.argv.slice(2);
const withThumb = process.argv.includes('--thumbnail');
if (!idArg || !dir) {
  console.error('Usage: node scripts/update-video.js <videoId|url> <content-folder> [--thumbnail]');
  process.exit(1);
}
const videoId = (idArg.match(/(?:v=|youtu\.be\/|shorts\/|video\/)([\w-]{11})/) || [, idArg])[1];
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf8'));

(async () => {
  const youtube = google.youtube({ version: 'v3', auth: getAuthorizedClient() });

  const { data } = await youtube.videos.list({ part: ['snippet', 'status'], id: [videoId] });
  const video = data.items?.[0];
  if (!video) throw new Error(`Video topilmadi yoki bu kanalniki emas: ${videoId}`);

  await youtube.videos.update({
    part: ['snippet', 'status'],
    requestBody: {
      id: videoId,
      snippet: {
        title: meta.title,
        description: meta.description,
        tags: meta.tags,
        categoryId: meta.categoryId,
        defaultLanguage: meta.defaultLanguage,
        defaultAudioLanguage: meta.defaultAudioLanguage,
      },
      status: {
        privacyStatus: video.status.privacyStatus, // keep whatever the owner chose
        selfDeclaredMadeForKids: meta.madeForKids,
        embeddable: video.status.embeddable,
        publicStatsViewable: video.status.publicStatsViewable,
        license: video.status.license,
        ...(video.status.publishAt ? { publishAt: video.status.publishAt } : {}),
      },
    },
  });
  console.log(`OK: metadata yangilandi -> https://studio.youtube.com/video/${videoId}/edit`);

  if (withThumb) {
    const thumb = path.join(dir, 'thumbnail.png');
    await youtube.thumbnails.set({ videoId, media: { mimeType: 'image/png', body: fs.createReadStream(thumb) } });
    console.log('OK: thumbnail o\'rnatildi');
  }
})().catch((e) => {
  console.error('XATO:', e.response?.data?.error?.message || e.message);
  process.exit(1);
});
