const fs = require('fs');
const path = require('path');
const https = require('https');

const EMOJI_MAP = {
  'uno_r0': '<:uno_r0:1433191075945779401>',
  'uno_r1': '<:uno_r1:1433191080567767062>',
  'uno_r2': '<:uno_r2:1433191085030641879>',
  'uno_r3': '<:uno_r3:1433191089107505315>',
  'uno_r4': '<:uno_r4:1433191093520040113>',
  'uno_r5': '<:uno_r5:1433191105091997696>',
  'uno_r6': '<:uno_r6:1433191109672177737>',
  'uno_r7': '<:uno_r7:1433191114504146945>',
  'uno_r8': '<:uno_r8:1433191118698319934>',
  'uno_r9': '<:uno_r9:1433191123299471443>',
  'uno_rskip': '<:uno_rskip:1433193235043319878>',
  'uno_rrev': '<:uno_rrev:1433194079927406663>',
  'uno_rp2': '<:uno_rp2:1433193252194095286>',
  'uno_b0': '<:uno_b0:1433191141376786577>',
  'uno_b1': '<:uno_b1:1433191146179264542>',
  'uno_b2': '<:uno_b2:1433191150436749439>',
  'uno_b3': '<:uno_b3:1433191154857279632>',
  'uno_b4': '<:uno_b4:1433191160167534774>',
  'uno_b5': '<:uno_b5:1433191165036859483>',
  'uno_b6': '<:uno_b6:1433191169285685362>',
  'uno_b7': '<:uno_b7:1433191174054613195>',
  'uno_b8': '<:uno_b8:1433191178676867124>',
  'uno_b9': '<:uno_b9:1433191183470825655>',
  'uno_bskip': '<:uno_bskip:1433193260691493085>',
  'uno_brev': '<:uno_brev:1433194088252838060>',
  'uno_bp2': '<:uno_bp2:1433193277284159651>',
  'uno_g0': '<:uno_g0:1433191202160640152>',
  'uno_g1': '<:uno_g1:1433191206363598939>',
  'uno_g2': '<:uno_g2:1433191211040116897>',
  'uno_g3': '<:uno_g3:1433191215565639830>',
  'uno_g4': '<:uno_g4:1433191220284493864>',
  'uno_g5': '<:uno_g5:1433191224751427595>',
  'uno_g6': '<:uno_g6:1433191229537124372>',
  'uno_g7': '<:uno_g7:1433191234104590518>',
  'uno_g8': '<:uno_g8:1433191238617534596>',
  'uno_g9': '<:uno_g9:1433191243822665749>',
  'uno_gskip': '<:uno_gskip:1433193285450465494>',
  'uno_grev': '<:uno_grev:1433194096327000167>',
  'uno_gp2': '<:uno_gp2:1433193303997808764>',
  'uno_y0': '<:uno_y0:1433191262227267696>',
  'uno_y1': '<:uno_y1:1433191266744664185>',
  'uno_y2': '<:uno_y2:1433191271219990598>',
  'uno_y3': '<:uno_y3:1433191275602907136>',
  'uno_y4': '<:uno_y4:1433191279696675040>',
  'uno_y5': '<:uno_y5:1433191284335575133>',
  'uno_y6': '<:uno_y6:1433191289620402267>',
  'uno_y7': '<:uno_y7:1433191294188126300>',
  'uno_y8': '<:uno_y8:1433191298747072644>',
  'uno_y9': '<:uno_y9:1433191303348359271>',
  'uno_yskip': '<:uno_yskip:1433193312336089108>',
  'uno_yrev': '<:uno_yrev:1433194105017733150>',
  'uno_yp2': '<:uno_yp2:1433193328903458937>',
  'uno_wild': '<:uno_wild:1433194845153005568>',
  'uno_wildp4': '<:uno_wildp4:1433194853495345263>',
};

const targetDir = path.join(__dirname, '../uno-cards');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  for (const [key, value] of Object.entries(EMOJI_MAP)) {
    const match = value.match(/:(\d+)>/);
    if (match) {
      const emojiId = match[1];
      const url = `https://cdn.discordapp.com/emojis/${emojiId}.png`;
      const filename = `${key}.png`;
      const dest = path.join(targetDir, filename);
      console.log(`Downloading ${key} from ${url}...`);
      try {
        await download(url, dest);
      } catch (err) {
        console.error(`Failed to download ${key}:`, err);
      }
    }
  }
  console.log("All UNO card assets downloaded successfully!");
}

main();
