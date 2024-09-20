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
  const fontCssHref = `https://fonts.googleapis.com/css?family=${family.replace(/\s+/g, "+")}:${style}&text=${encodeURI(family)}`;

  return `<html>
    <head>
        <link rel="stylesheet" href="${fontCssHref}">
        <style>
            html, body {
              margin: 0;
            }

            body {
                display: flex;
                height: 100vh;
                align-items: center;
                justify-content: center;
                white-space: nowrap;
            }

            .preview {
                font-family: "${family}";
                font-size: ${size};
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

  await page.setViewport({ width: 500, height: height * 2, deviceScaleFactor: 1 });
  await page.goto(`data:text/html,${generateHTMLPreview(family, height, style)}`, { waitUntil: 'networkidle0' });

  const previewItem = await page.waitForSelector("div.preview");
  const previewItemScreenshot = await previewItem.screenshot({ omitBackground: true, captureBeyondViewport: true });

  await page.close();

  const previewOutputPath = `${output}/${family}-${style}.png`;

  const trimmedPreview = sharp(previewItemScreenshot)
    .trim({ lineArt: true })
    .resize({ height: height })
    .png();
  await trimmedPreview.toFile(previewOutputPath);

  console.log(`Generated preview: ${previewOutputPath}`);

  return previewOutputPath;
};

workerpool.worker({ generatePreview });


