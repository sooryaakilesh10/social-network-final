const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    await page.goto('file:///Users/sooryaakilesh/test/social-network-final/index.html');
    
    // Switch to arrange tab
    await page.evaluate(() => {
        document.querySelector('.nav-btn[data-tab="arrange"]').click();
    });
    
    // Click play song
    await page.evaluate(() => {
        document.getElementById('song-play-btn').click();
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
})();
