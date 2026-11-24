// River & Border Studio — upload a finished video to the owner's own channel.
// Resumable upload (videos.insert) with metadata from metadata.json, then the custom thumbnail.
//
// Usage:
//   node scripts/upload-video.js <video.mp4> <content-folder> [--privacy private|unlisted|public] [--publish-at 2026-12-01T15:00:00Z]
//
// <content-folder> must contain metadata.json (title, description, tags, categoryId, defaultLanguage,
// defaultAudioLanguage, madeForKids) and optionally thumbnail.png.
// A scheduled upload (--publish-at) is always sent as private; YouTube publishes it at that time.
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { getAuthorizedClient } = require('./lib/auth');

function parseArgs(argv) {
  const [file, dir, ...rest] = argv;
  const opts = { privacy: 'private', publishAt: null };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--privacy') opts.privacy = rest[++i];
    else if (rest[i] === '--publish-at') opts.publishAt = rest[++i];
  }
  if (!file || !dir) {
    console.error('Usage: node scripts/upload-video.js <video.mp4> <content-folder> [--privacy private|unlisted|public] [--publish-at ISO-8601]');
    process.exit(1);
  }
  if (!['private', 'unlisted', 'public'].includes(opts.privacy)) throw new Error(`Invalid --privacy: ${opts.privacy}`);
  if (opts.publishAt && Number.isNaN(Date.parse(opts.publishAt))) throw new Error(`Invalid --publish-at: ${opts.publishAt}`);
  return { file, dir, ...opts };
}

async function main() {
  const { file, dir, privacy, publishAt } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(file)) throw new Error(`Video file not found: ${file}`);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf8'));
  const youtube = google.youtube({ version: 'v3', auth: getAuthorizedClient() });

  const size = fs.statSync(file).size;
  const started = Date.now();
  let lastPct = -1;

  const res = await youtube.videos.insert(
    {
      part: ['snippet', 'status'],
      notifySubscribers: true,
      requestBody: {
        snippet: {
          title: meta.title,
          description: meta.description,
          tags: meta.tags,
          categoryId: meta.categoryId,
          defaultLanguage: meta.defaultLanguage,
          defaultAudioLanguage: meta.defaultAudioLanguage,
        },
        status: {
          privacyStatus: publishAt ? 'private' : privacy,
          ...(publishAt ? { publishAt: new Date(publishAt).toISOString() } : {}),
          selfDeclaredMadeForKids: Boolean(meta.madeForKids),
          embeddable: true,
          license: 'youtube',
        },
      },
      media: { mimeType: 'video/mp4', body: fs.createReadStream(file) },
    },
    {
      // googleapis uses a resumable upload for media bodies; report progress.
      onUploadProgress: (evt) => {
        const pct = Math.floor((evt.bytesRead / size) * 100);
        if (pct !== lastPct && pct % 5 === 0) {
          lastPct = pct;
          process.stdout.write(`\rUploading… ${pct}%`);
        }
      },
    },
  );
  process.stdout.write('\n');

  const id = res.data.id;
  console.log(`OK: uploaded in ${((Date.now() - started) / 1000).toFixed(0)} s`);
  console.log(`    video id : ${id}`);
  console.log(`    status   : ${res.data.status.privacyStatus}${publishAt ? ` (publishes ${publishAt})` : ''}`);
  console.log(`    watch    : https://youtu.be/${id}`);
  console.log(`    studio   : https://studio.youtube.com/video/${id}/edit`);

  const thumb = path.join(dir, 'thumbnail.png');
  if (fs.existsSync(thumb)) {
    try {
      await youtube.thumbnails.set({ videoId: id, media: { mimeType: 'image/png', body: fs.createReadStream(thumb) } });
      console.log('OK: custom thumbnail set');
    } catch (e) {
      // Custom thumbnails need a phone-verified channel; the upload itself still succeeded.
      console.warn('WARN: thumbnail not set:', e.response?.data?.error?.message || e.message);
    }
  }
}

main().catch((e) => {
  console.error('ERROR:', e.response?.data?.error?.message || e.message);
  process.exit(1);
});
