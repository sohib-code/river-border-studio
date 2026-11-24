// Prints the authorized channel's basic info. Usage: node scripts/channel-info.js
const { google } = require('googleapis');
const { getAuthorizedClient } = require('./lib/auth');

(async () => {
  const youtube = google.youtube({ version: 'v3', auth: getAuthorizedClient() });
  const { data } = await youtube.channels.list({
    part: ['snippet', 'statistics', 'status', 'brandingSettings', 'contentDetails'],
    mine: true,
  });
  if (!data.items || data.items.length === 0) {
    console.log('Bu akkauntda kanal topilmadi.');
    return;
  }
  for (const ch of data.items) {
    console.log({
      id: ch.id,
      title: ch.snippet.title,
      handle: ch.snippet.customUrl,
      country: ch.snippet.country || '(yo\'q)',
      created: ch.snippet.publishedAt,
      subscribers: ch.statistics.subscriberCount,
      videos: ch.statistics.videoCount,
      views: ch.statistics.viewCount,
      madeForKids: ch.status.madeForKids,
      longUploads: ch.status.longUploadsStatus,
      privacy: ch.status.privacyStatus,
      uploadsPlaylist: ch.contentDetails.relatedPlaylists.uploads,
    });
  }
})().catch((e) => {
  console.error('XATO:', e.response?.data?.error?.message || e.message);
  process.exit(1);
});
