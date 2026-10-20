import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function test() {
  console.log("Testing puppeteer-core launch...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  console.log("Browser launched successfully!");
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle0" });
  const title = await page.title();
  console.log("Page title:", title);
  await browser.close();
  console.log("Browser closed successfully.");
}

test().catch(console.error);
