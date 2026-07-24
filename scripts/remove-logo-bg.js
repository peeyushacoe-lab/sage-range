// One-off: extract alpha from the black-background logo render so it composites
// transparently. The source has no alpha; it's a glow-effect render on pure
// black. Two complications over a naive alpha=max(R,G,B) unpremultiply:
//
// 1. The "black" background carries a noise floor (dithering/compression) of
//    roughly 1-30 per channel, which a naive unpremultiply amplifies into
//    visible color speckle. Fixed with a black-level threshold (levels
//    adjustment) before extracting alpha.
// 2. The eagle itself has intentional dark shaded facets (low-poly shadow
//    faces) that are colorimetrically indistinguishable from the background.
//    A pure luminance threshold would punch holes in the bird. Fixed by
//    flood-filling the background-candidate region inward from the image
//    border only (4-connectivity) — dark pixels enclosed by the bird's
//    bright glow edges are never reached, so they stay opaque.
const sharp = require("sharp");
const path = require("path");

const input = path.join(__dirname, "..", "public", "logo.png");
const FLOOD_THRESHOLD = 45; // max(R,G,B) below this is background-candidate for flood fill
const ALPHA_THRESHOLD = 24; // levels floor applied to flood-filled background pixels

async function main() {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const n = width * height;

  const m = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    m[i] = Math.max(data[i * channels], data[i * channels + 1], data[i * channels + 2]);
  }

  const isBg = new Uint8Array(n); // 1 = confirmed background (flood-reached)
  const queue = new Int32Array(n);
  let qHead = 0, qTail = 0;

  const tryPush = (idx) => {
    if (!isBg[idx] && m[idx] < FLOOD_THRESHOLD) {
      isBg[idx] = 1;
      queue[qTail++] = idx;
    }
  };

  for (let x = 0; x < width; x++) {
    tryPush(x); // top row
    tryPush((height - 1) * width + x); // bottom row
  }
  for (let y = 0; y < height; y++) {
    tryPush(y * width); // left col
    tryPush(y * width + width - 1); // right col
  }

  while (qHead < qTail) {
    const idx = queue[qHead++];
    const x = idx % width;
    const y = (idx - x) / width;
    if (x > 0) tryPush(idx - 1);
    if (x < width - 1) tryPush(idx + 1);
    if (y > 0) tryPush(idx - width);
    if (y < height - 1) tryPush(idx + width);
  }

  const out = Buffer.alloc(n * 4);
  const denom = 255 - ALPHA_THRESHOLD;

  for (let i = 0; i < n; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    const mi = m[i];

    if (!isBg[i]) {
      // Part of the bird/text art (including enclosed dark facets) — keep as-is.
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = 255;
      continue;
    }

    let alpha = 0, nr = 0, ng = 0, nb = 0;
    if (mi > ALPHA_THRESHOLD) {
      alpha = Math.min(255, Math.round(((mi - ALPHA_THRESHOLD) * 255) / denom));
      nr = Math.min(255, Math.round((r * 255) / mi));
      ng = Math.min(255, Math.round((g * 255) / mi));
      nb = Math.min(255, Math.round((b * 255) / mi));
    }
    out[i * 4] = nr;
    out[i * 4 + 1] = ng;
    out[i * 4 + 2] = nb;
    out[i * 4 + 3] = alpha;
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(input);

  console.log(`Done: ${width}x${height}, flood=${FLOOD_THRESHOLD}, alphaFloor=${ALPHA_THRESHOLD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
