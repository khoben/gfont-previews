import workerpool from 'workerpool';
import puppeteer from "puppeteer";
import sharp from "sharp";

async function createBrowser() {
  return await puppeteer.launch({
    headless: "shell",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
    ]
  });
}

const generateHTMLPreview = (family, size, style) => {
  const fontCssHref = `https://fonts.googleapis.com/css?family=${family.replace(/\s+/g, "+")}:${style}&text=${encodeURIComponent(family)}`;

  return `<html>
    <head>
        <link rel="stylesheet" href="${fontCssHref}">
        <style>
            .preview {
                display: inline-block;
                font-family: "${family}";
                font-size: ${size}px;
                padding: ${size}px;
                white-space: nowrap;
            }
        </style>
    </head>
    <body>
        <div class="preview">${family}</div>
    </body>
    </html>`;
};

const browser = await createBrowser();

const generatePreview = async (family, style, height, output) => {
  const page = await browser.newPage();

  await page.setViewport({ width: height * 10, height: height * 2, deviceScaleFactor: 1 });

  await page.goto(`data:text/html,${generateHTMLPreview(family, height, style)}`, { waitUntil: "load" });
  // Wait for fonts to load
  await page.evaluateHandle('document.fonts.ready');

  const previewItemScreenshot = await page.screenshot({ type: "png", omitBackground: true, fullPage: true });

  await page.close();

  const previewOutputPath = `${output}/${family}-${style}.png`;

  await sharp(previewItemScreenshot)
    .trim({ lineArt: true, threshold: 3 })
    .resize({ height: height, fit: "contain" })
    .toFile(previewOutputPath)

  console.log(`Generated preview: ${previewOutputPath}`);

  return previewOutputPath;
};

workerpool.worker({ generatePreview });


