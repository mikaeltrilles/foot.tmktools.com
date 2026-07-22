const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf-8').replace(/src="assets\/([^"]+)"/g, 'data-src="$1"');

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://foot.tmktools.com/' });
const window = dom.window;

// Stub fetch to return our API data
const apiData = JSON.parse(fs.readFileSync('wcup-deployed.json', 'utf-8'));
window.fetch = async (url) => {
  if (String(url).includes('wcup2026-proxy.php')) {
    return { ok: true, json: async () => apiData };
  }
  return { ok: false, status: 404 };
};

// Load app.v2.min.js
const appSrc = fs.readFileSync('assets/app.v2.min.js', 'utf-8');
const appScript = window.document.createElement('script');
appScript.textContent = appSrc;
window.document.body.appendChild(appScript);

// Load knockout-bracket.js
const bracketSrc = fs.readFileSync('assets/knockout-bracket.js', 'utf-8');
const bracketScript = window.document.createElement('script');
bracketScript.textContent = bracketSrc;
window.document.body.appendChild(bracketScript);

// Trigger init
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

// Wait a bit
setTimeout(() => {
  try {
    console.log('chartMatches count:', window.chartMatches ? window.chartMatches.length : 0);
    console.log('knockout HTML length:', window.document.getElementById('knockout-grid').innerHTML.length);
    // Check for any undefined score
    if (window.chartMatches) {
      window.chartMatches.forEach(m => {
        if (!m.score || (m.score.fullTime && (m.score.fullTime.home === undefined || m.score.fullTime.away === undefined))) {
          console.log('suspicious score:', m.id, m.score);
        }
      });
    }
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
  }
}, 2000);
