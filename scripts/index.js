import workerpool from 'workerpool';
import os from "node:os";
import fs from "node:fs";

const GFONT_API_KEY = process.env.GFONT_API_KEY;
const CACHED_GFONT_PATH = "./output/google.json";
const OUTPUT_FOLDER_PATH = "./output/previews";
const OUTPUT_HEIGHT_PX = 48;

const pool = workerpool.pool(
  './scripts/fontPreviewWorker.js',
  { minWorkers: "max", maxWorkers: os.availableParallelism() }
);

async function computeDiffWithCached(apiResult) {
  const cached = fs.existsSync(CACHED_GFONT_PATH);

  if (cached) {
    const cachedGoogleFontsData = JSON.parse(fs.readFileSync(CACHED_GFONT_PATH));

    fs.writeFileSync(CACHED_GFONT_PATH, JSON.stringify(apiResult));

    const diffItems = apiResult.items.filter(
      value => !cachedGoogleFontsData.items.some(
        obj => obj.family === value.family && obj.version === value.version
      )
    );

    console.log(`Found ${diffItems.length} fonts to be updated`);

    apiResult.items = diffItems;
  } else {
    fs.writeFileSync(CACHED_GFONT_PATH, JSON.stringify(apiResult));
  }
  return apiResult;
}

async function run() {

  const apiResult = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${GFONT_API_KEY}`)
    .then(raw => raw.json())
    .catch(err => console.error(err));

  if (!apiResult) {
    return Promise.reject("No api result");
  }

  if ("error" in apiResult) {
    return Promise.reject(apiResult.error.message);
  }

  const result = await computeDiffWithCached(apiResult);

  const promises = [];
  for (const font of result.items) {

    const family = font.family;
    const variants = font.files;

    const fontFamilyPromises = Object.entries(variants)
      .map(([style, url]) => pool.exec(
        'generatePreview',
        [family, style, OUTPUT_HEIGHT_PX, OUTPUT_FOLDER_PATH]
      ).then(path => ({
        family: family,
        style: style,
        filePreviewPath: path
      })).catch((err) => {
        console.error(err);
      }));

    promises.push(...fontFamilyPromises);
  }

  return Promise.all(promises)
}

// Create output folder if not exists
if (!fs.existsSync(OUTPUT_FOLDER_PATH)) {
  fs.mkdirSync(OUTPUT_FOLDER_PATH, { recursive: true });
}

// Run generate font previews
run().then((results) => {
  console.log(`Done! Updated ${results.length} fonts`);
}).catch((err) => {
  console.error(err);
}).finally(() => pool.terminate()
  .then(() => { console.log('Terminated'); })
);