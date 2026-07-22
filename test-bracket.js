const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = `
<!DOCTYPE html>
<html>
<body>
  <div id="knockout-grid"></div>
  <script>
    window.chartMatches = [];
    function translateTeamName(name) { return name; }
    function flagCodeForTeam(team) {
      const codes = {
        'Mexique':'mx','Afrique du Sud':'za','Corée du Sud':'kr','Tchéquie':'cz','Canada':'ca',
        'Bosnie-Herzégovine':'ba','Qatar':'qa','Suisse':'ch','Brésil':'br','Maroc':'ma',
        'Haïti':'ht','Écosse':'gb-sct','États-Unis':'us','Paraguay':'py','Australie':'au',
        'Turquie':'tr','Allemagne':'de','Curaçao':'cw','Cote dIvoire':'ci','Équateur':'ec',
        'Pays-Bas':'nl','Japon':'jp','Suède':'se','Tunisie':'tn','Belgique':'be','Égypte':'eg',
        'Iran':'ir','Nouvelle-Zélande':'nz','Espagne':'es','Cap-Vert':'cv','Arabie Saoudite':'sa',
        'Uruguay':'uy','France':'fr','Sénégal':'sn','Irak':'iq','Norvège':'no','Argentine':'ar',
        'Algérie':'dz','Autriche':'at','Jordanie':'jo','Portugal':'pt','RD Congo':'cd',
        'Ouzbékistan':'uz','Colombie':'co','Angleterre':'gb-eng','Croatie':'hr','Ghana':'gh','Panama':'pa'
      };
      return codes[team] || 'xx';
    }
    function computeGroupStandings(matches) {
      const groups = {};
      matches.forEach(m => {
        if (!m.group || m.stage !== 'GROUP_STAGE') return;
        const g = m.group, h = m.homeTeam.name, a = m.awayTeam.name;
        if (!h || !a) return;
        const sh = m.score.fullTime.home, sa = m.score.fullTime.away;
        if (sh == null || sa == null) return;
        groups[g] = groups[g] || {};
        [h, a].forEach(t => groups[g][t] = groups[g][t] || {team:t, played:0, won:0, drawn:0, lost:0, gf:0, ga:0, points:0});
        groups[g][h].played++; groups[g][a].played++;
        groups[g][h].gf += sh; groups[g][h].ga += sa;
        groups[g][a].gf += sa; groups[g][a].ga += sh;
        if (sh > sa) { groups[g][h].won++; groups[g][h].points += 3; groups[g][a].lost++; }
        else if (sa > sh) { groups[g][a].won++; groups[g][a].points += 3; groups[g][h].lost++; }
        else { groups[g][h].drawn++; groups[g][h].points++; groups[g][a].drawn++; groups[g][a].points++; }
      });
      return Object.fromEntries(Object.entries(groups).map(([k,v]) => [k, Object.values(v).sort((a,b) => b.points - a.points || (b.gf-b.ga)-(a.gf-a.ga) || b.gf-a.gf || a.team.localeCompare(b.team,'fr'))]));
    }
  </script>
</body>
</html>
`;

const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
const window = dom.window;

// Charger knockout-bracket.js
const bracketSrc = fs.readFileSync('assets/knockout-bracket.js', 'utf-8');
const script = window.document.createElement('script');
script.textContent = bracketSrc;
window.document.body.appendChild(script);

// Charger les données API et les parser comme le fait app.v2.min.js
const raw = JSON.parse(fs.readFileSync('wcup-deployed.json', 'utf-8'));
function stageFromRound(r) {
  const s = (r || '').toLowerCase();
  if (s.includes('round of 32')) return 'ROUND_OF_32';
  if (s.includes('round of 16')) return 'ROUND_OF_16';
  if (s.includes('quarter')) return 'QUARTER_FINALS';
  if (s.includes('semi')) return 'SEMI_FINALS';
  if (s.includes('third') || s.includes('3rd')) return 'THIRD_PLACE';
  if (s.includes('final')) return 'FINAL';
  return 'GROUP_STAGE';
}
const matches = raw.matches.map(e => {
  const t1 = e.team1, t2 = e.team2;
  const score = Array.isArray(e.score) ? e.score : [null, null];
  const goals1 = (e.goals1 || []).map(g => ({minute: String(g.minute ?? ''), scorer: g.name, team: {name: t1}, side: 'home', ownGoal: false}));
  const goals2 = (e.goals2 || []).map(g => ({minute: String(g.minute ?? ''), scorer: g.name, team: {name: t2}, side: 'away', ownGoal: false}));
  const stage = stageFromRound(e.round);
  const group = e.group && e.group.toUpperCase().startsWith('GROUP') ? 'Groupe ' + e.group.replace(/^Group\s*/i, '').toUpperCase() : '';
  return {
    id: e.id,
    homeTeam: {name: t1, shortName: t1.slice(0,3).toUpperCase(), tla: t1.slice(0,3).toUpperCase()},
    awayTeam: {name: t2, shortName: t2.slice(0,3).toUpperCase(), tla: t2.slice(0,3).toUpperCase()},
    score: {fullTime: {home: score[0], away: score[1]}},
    goals: goals1.concat(goals2),
    status: 'FINISHED',
    stage,
    group,
    utcDate: new Date(e.datetime * 1000).toISOString(),
    venue: e.ground
  };
});

window.chartMatches = matches;

try {
  window.renderKnockoutBracket(matches);
  console.log('OK - bracket rendered');
  console.log('container HTML length:', window.document.getElementById('knockout-grid').innerHTML.length);
} catch (err) {
  console.error('ERROR:', err.message);
  console.error(err.stack);
}
