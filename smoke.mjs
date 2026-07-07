import { chromium } from 'playwright';
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
const dir = process.argv[2];

await page.goto('http://localhost:4180/', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.getByText('Senior Hurling', { exact: false }).first().click({ timeout: 5000 });
await page.waitForTimeout(600);

const before = await page.evaluate(() => JSON.parse(localStorage.getItem('gaa_coach_hub_v2')).settings.lastBackup);
console.log('lastBackup before:', before);

// resume the in-progress match
await page.getByText('Resume', { exact: true }).first().click({ timeout: 5000 });
await page.waitForTimeout(700);
await page.screenshot({ path: dir + '/m1-live.png' });

// end the match
const endBtn = page.getByText('End match & save result', { exact: false });
await endBtn.scrollIntoViewIfNeeded();
await endBtn.click({ timeout: 5000 });
await page.waitForTimeout(700);
await page.screenshot({ path: dir + '/m2-saved-toast.png' });

const backNow = page.getByText('Back up now', { exact: true });
console.log('"Back up now" action present:', await backNow.count());

if (await backNow.count()) {
  const dlPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await backNow.first().click();
  const dl = await dlPromise;
  await page.waitForTimeout(600);
  console.log('download:', dl ? dl.suggestedFilename() : 'none');
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('gaa_coach_hub_v2')).settings.lastBackup);
  console.log('lastBackup after:', after, 'updated:', !!after && after !== before);
  await page.screenshot({ path: dir + '/m3-backed-up.png' });
  // confirm the completed match is IN the backup (fresh-state check)
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('gaa_coach_hub_v2')));
  const completed = (st.fixtures || []).filter(f => f.status === 'completed').length;
  console.log('completed fixtures in saved state:', completed);
}
console.log('ERRORS:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
