/* ═══════════════════════════════════════════════════════════════════════════
   BRACKET COUPE DU MONDE — Phase finale ( Live )
   Affiche l’arbre de tournoi réel de la phase finale.
   Les équipes sont positionnées au fur et à mesure des résultats :
   - Round of 32 : équipes/placeholders fournis par l’API
   - Tours suivants : vainqueurs/perdants des matchs terminés
   Les emplacements non encore déterminés restent en placeholder.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const TOURNAMENT_STRUCTURE = [
    {
      name: '16èmes de finale',
      key: 'ROUND_OF_32',
      matches: [
        { id: 72, home: '2A', away: '2B' },
        { id: 73, home: 'Germany', away: '3A/B/C/D/F' },
        { id: 74, home: '1F', away: '2C' },
        { id: 75, home: '1C', away: '2F' },
        { id: 76, home: '1I', away: '3C/D/F/G/H' },
        { id: 77, home: '2E', away: '2I' },
        { id: 78, home: 'Mexico', away: '3C/E/F/H/I' },
        { id: 79, home: '1L', away: '3E/H/I/J/K' },
        { id: 80, home: 'USA', away: '3B/E/F/I/J' },
        { id: 81, home: '1G', away: '3A/E/H/I/J' },
        { id: 82, home: '2K', away: '2L' },
        { id: 83, home: '1H', away: '2J' },
        { id: 84, home: '1B', away: '3E/F/G/I/J' },
        { id: 85, home: '1J', away: '2H' },
        { id: 86, home: '1K', away: '3D/E/I/J/L' },
        { id: 87, home: '2D', away: '2G' }
      ]
    },
    {
      name: '8èmes de finale',
      key: 'ROUND_OF_16',
      matches: [
        { id: 88, home: { winnerOf: 74 }, away: { winnerOf: 77 } },
        { id: 89, home: { winnerOf: 73 }, away: { winnerOf: 75 } },
        { id: 90, home: { winnerOf: 76 }, away: { winnerOf: 78 } },
        { id: 91, home: { winnerOf: 79 }, away: { winnerOf: 80 } },
        { id: 92, home: { winnerOf: 83 }, away: { winnerOf: 84 } },
        { id: 93, home: { winnerOf: 81 }, away: { winnerOf: 82 } },
        { id: 94, home: { winnerOf: 86 }, away: { winnerOf: 88 } },
        { id: 95, home: { winnerOf: 85 }, away: { winnerOf: 87 } }
      ]
    },
    {
      name: 'Quarts de finale',
      key: 'QUARTER_FINALS',
      matches: [
        { id: 96, home: { winnerOf: 89 }, away: { winnerOf: 90 } },
        { id: 97, home: { winnerOf: 93 }, away: { winnerOf: 94 } },
        { id: 98, home: { winnerOf: 91 }, away: { winnerOf: 92 } },
        { id: 99, home: { winnerOf: 95 }, away: { winnerOf: 96 } }
      ]
    },
    {
      name: 'Demi-finales',
      key: 'SEMI_FINALS',
      matches: [
        { id: 100, home: { winnerOf: 97 }, away: { winnerOf: 98 } },
        { id: 101, home: { winnerOf: 99 }, away: { winnerOf: 100 } }
      ]
    },
    {
      name: 'Finale',
      key: 'FINAL',
      matches: [{ id: 103, home: { winnerOf: 101 }, away: { winnerOf: 102 } }]
    },
    {
      name: '3ème place',
      key: 'THIRD_PLACE',
      matches: [{ id: 102, home: { loserOf: 101 }, away: { loserOf: 100 } }]
    }
  ];

  function safeTranslateTeamName(name) {
    if (typeof translateTeamName === 'function') return translateTeamName(name);
    return name;
  }

  function safeFlagCode(team) {
    if (typeof flagCodeForTeam === 'function') return flagCodeForTeam(team);
    return 'xx';
  }

  function getMatchResult(match) {
    if (!match) return null;
    if (match.score?.winner === 'home' || match.score?.winner === 'away') return match.score.winner;
    let home, away;
    if (match.score && typeof match.score === 'object') {
      if (match.score.fullTime) {
        home = Number(match.score.fullTime.home);
        away = Number(match.score.fullTime.away);
      } else if (Array.isArray(match.score)) {
        home = Number(match.score[0]);
        away = Number(match.score[1]);
      }
    }
    if (isNaN(home) || isNaN(away)) return null;
    if (home > away) return 'home';
    if (away > home) return 'away';
    return 'draw';
  }

  function isFinished(match) {
    if (!match) return false;
    const status = String(match.status || '').toLowerCase();
    return status === 'finished' || status === 'ft' || match.finished === true || match.finished === 'TRUE';
  }

  function getTeamSideName(match, side) {
    if (!match) return null;
    const team = side === 'home' ? match.homeTeam : match.awayTeam;
    return team?.name || null;
  }

  function getMatchWinner(match) {
    const result = getMatchResult(match);
    if (!result || result === 'draw') return null;
    return getTeamSideName(match, result);
  }

  function getMatchLoser(match) {
    const result = getMatchResult(match);
    if (!result || result === 'draw') return null;
    return getTeamSideName(match, result === 'home' ? 'away' : 'home');
  }

  function roundLabelFromKey(key) {
    switch (key) {
      case 'ROUND_OF_32': return '16èmes de finale';
      case 'ROUND_OF_16': return '8èmes de finale';
      case 'QUARTER_FINALS': return 'Quarts de finale';
      case 'SEMI_FINALS': return 'Demi-finales';
      case 'FINAL': return 'Finale';
      case 'THIRD_PLACE': return '3ème place';
      default: return key;
    }
  }

  function safeComputeGroupStandings(matches) {
    if (typeof computeGroupStandings === 'function') return computeGroupStandings(matches);
    return null;
  }

  function safeGetKnockoutSlot(standings, groupLetter, place) {
    const group = `Groupe ${groupLetter}`;
    const teams = standings?.[group];
    if (teams && teams[place - 1]) {
      return { type: 'team', label: safeTranslateTeamName(teams[place - 1].team) };
    }
    return null;
  }

  function getAllBestThirdTeams(standings) {
    if (!standings) return [];
    const thirds = [];
    Object.entries(standings).forEach(([group, teams]) => {
      if (teams && teams[2]) {
        thirds.push({ ...teams[2], group: group.replace(/^Groupe\s+/i, '') });
      }
    });
    return thirds
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const ad = a.gf - a.ga, bd = b.gf - b.ga;
        if (bd !== ad) return bd - ad;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.team.localeCompare(b.team, 'fr');
      })
      .slice(0, 8);
  }

  function resolveSlot(slot, matchesById, matchId, standings, usedThirds) {
    if (!slot) return { type: 'placeholder', label: '—' };

    // Référence Wxx / Lxx (texte ou objet)
    let ref = null;
    let isLoser = false;
    if (typeof slot === 'object') {
      if (slot.winnerOf) ref = slot.winnerOf;
      else if (slot.loserOf) {
        ref = slot.loserOf;
        isLoser = true;
      }
    } else if (typeof slot === 'string') {
      const winMatch = slot.match(/^W(\d+)$/i);
      const loseMatch = slot.match(/^L(\d+)$/i);
      if (winMatch) ref = parseInt(winMatch[1], 10);
      else if (loseMatch) {
        ref = parseInt(loseMatch[1], 10);
        isLoser = true;
      }
    }

    if (ref) {
      const refMatch = matchesById[ref];
      if (isFinished(refMatch)) {
        const team = isLoser ? getMatchLoser(refMatch) : getMatchWinner(refMatch);
        if (team) {
          return { type: 'team', label: safeTranslateTeamName(team) };
        }
      }
      const round = TOURNAMENT_STRUCTURE.find(r => r.matches.some(m => m.id === ref));
      const roundName = round ? roundLabelFromKey(round.key) : 'match';
      const prefix = isLoser ? 'Perdant' : 'Vainqueur';
      return { type: 'placeholder', label: `${prefix} ${roundName} ${ref}` };
    }

    const label = typeof slot === 'string' ? slot : String(slot);
    const translated = safeTranslateTeamName(label);

    // Placeholder de classement de groupe : 1A, 2B, 3A/B/C/D/F, etc.
    const groupPlaceMatch = label.match(/^(\d)([A-L])$/i);
    if (groupPlaceMatch && standings) {
      const resolved = safeGetKnockoutSlot(standings, groupPlaceMatch[2].toUpperCase(), parseInt(groupPlaceMatch[1], 10));
      if (resolved) return resolved;
      return { type: 'placeholder', label: `${groupPlaceMatch[1]}${groupPlaceMatch[2].toUpperCase()}` };
    }

    // Placeholder de meilleure 3ème : 3A/B/C/D/F
    const thirdPlaceMatch = label.match(/^3([A-L](?:\/[A-L])*)$/i);
    if (thirdPlaceMatch && standings && usedThirds) {
      const allowedGroups = thirdPlaceMatch[1].split('/').map(g => g.toUpperCase());
      const bestThirds = getAllBestThirdTeams(standings);
      const picked = bestThirds.find(t => !usedThirds.has(t.team) && allowedGroups.includes(t.group));
      if (picked) {
        usedThirds.add(picked.team);
        return { type: 'team', label: safeTranslateTeamName(picked.team) };
      }
      return { type: 'placeholder', label: `3${thirdPlaceMatch[1]}` };
    }

    // Équipe connue : on a un drapeau valide
    if (safeFlagCode(translated) !== 'xx') {
      return { type: 'team', label: translated };
    }

    return { type: 'placeholder', label: translated };
  }

  function buildLiveBracket(matches) {
    if (!matches || !matches.length) return null;

    const matchesById = {};
    matches.forEach(m => {
      if (m.id != null) matchesById[m.id] = m;
    });

    // Si l'API n'a pas encore publié les matchs de phase finale, on ne peut pas construire le bracket
    const hasKnockout = TOURNAMENT_STRUCTURE.some(round =>
      round.matches.some(m => matchesById[m.id])
    );
    if (!hasKnockout) return null;

    // Positionnement provisoire des 16èmes à partir des classements actuels de groupes.
    // Aucune simulation : on utilise uniquement les résultats déjà enregistrés.
    const standings = safeComputeGroupStandings(matches);
    const usedThirds = new Set();

    const rounds = TOURNAMENT_STRUCTURE.map(round => ({
      name: round.name,
      key: round.key,
      matches: round.matches.map(m => ({
        id: m.id,
        home: resolveSlot(m.home, matchesById, m.id, standings, usedThirds),
        away: resolveSlot(m.away, matchesById, m.id, standings, usedThirds),
        apiMatch: matchesById[m.id] || null
      }))
    }));

    // Propager les vainqueurs/perdants déjà connus aux matchs suivants pour afficher
    // le chemin qualificatif dès qu'un résultat est officiel.
    rounds.forEach((round, roundIndex) => {
      round.matches.forEach(m => {
        if (!m.apiMatch || !isFinished(m.apiMatch)) return;
        const winner = getMatchWinner(m.apiMatch);
        const loser = getMatchLoser(m.apiMatch);
        if (!winner) return;

        // Chercher les matchs suivants qui attendent ce résultat
        for (let i = roundIndex + 1; i < rounds.length; i++) {
          rounds[i].matches.forEach(nextMatch => {
            const checkHome = nextMatch.apiMatch ? (nextMatch.apiMatch.team1 === `W${m.id}` || nextMatch.apiMatch.team1 === `L${m.id}`) : false;
            const checkAway = nextMatch.apiMatch ? (nextMatch.apiMatch.team2 === `W${m.id}` || nextMatch.apiMatch.team2 === `L${m.id}`) : false;

            if (checkHome) {
              const isLoser = nextMatch.apiMatch.team1.startsWith('L');
              nextMatch.home = { type: 'team', label: safeTranslateTeamName(isLoser ? loser : winner) };
            }
            if (checkAway) {
              const isLoser = nextMatch.apiMatch.team2.startsWith('L');
              nextMatch.away = { type: 'team', label: safeTranslateTeamName(isLoser ? loser : winner) };
            }
          });
        }
      });
    });

    return rounds;
  }

  function teamHTML(team) {
    const isPlaceholder = team.type === 'placeholder';
    const label = team.label || '—';
    const flag = isPlaceholder ? 'xx' : safeFlagCode(label);
    const flagHTML =
      flag !== 'xx'
        ? `<span class="flag-tiny" aria-hidden="true"><img src="https://flagcdn.com/${flag}.svg" alt="" loading="lazy" crossorigin="anonymous"></span>`
        : '<span class="flag-placeholder" aria-hidden="true"></span>';
    return `
      <div class="knockout-team ${isPlaceholder ? 'placeholder' : 'known'}">
        <span class="knockout-team-name">${flagHTML} <span>${label}</span></span>
        <span class="knockout-score">-</span>
      </div>`;
  }

  function matchHTML(match, extraClass, note) {
    return `
      <article class="knockout-match ${extraClass || ''}" role="listitem" data-match-id="${match.id || ''}">
        ${teamHTML(match.home)}
        ${teamHTML(match.away)}
        <div class="knockout-match-note">${note}</div>
      </article>`;
  }

  function renderWorldCupBracket(matches) {
    const container = document.getElementById('knockout-grid');
    if (!container) return;

    const rounds = buildLiveBracket(matches);
    if (!rounds || rounds.length === 0) {
      container.innerHTML =
        '<p class="knockout-empty">Le tableau de phase finale sera disponible une fois les groupes constitués.</p>';
      return;
    }

    let html = '<div class="knockout-bracket-wrapper">';
    html += '<div class="knockout-bracket">';

    // Tours 0..3 : 16èmes → 8èmes → quarts → demis
    for (let i = 0; i < 4; i++) {
      html += `<div class="knockout-col" data-round="${i}">
        <div class="knockout-round-title">${rounds[i].name}</div>
        <div class="knockout-matches">
          ${rounds[i].matches.map((m) => matchHTML(m, '', m.apiMatch && isFinished(m.apiMatch) ? 'Qualifié' : 'À déterminer')).join('')}
        </div>
      </div>`;
    }

    // Colonne finale : finale + 3ème place
    const finalRound = rounds.find(r => r.key === 'FINAL');
    const thirdRound = rounds.find(r => r.key === 'THIRD_PLACE');
    html += `<div class="knockout-col final-col" data-round="4">
      <div class="final-block">
        <div class="knockout-round-title">${finalRound ? finalRound.name : 'Finale'}</div>
        ${finalRound ? matchHTML(finalRound.matches[0], 'final-match', '🏆 À déterminer') : ''}
      </div>
      <div class="third-block">
        <div class="knockout-round-title">${thirdRound ? thirdRound.name : '3ème place'}</div>
        ${thirdRound ? matchHTML(thirdRound.matches[0], 'third-place-match', '3ème place') : ''}
      </div>
    </div>`;

    html += '<svg class="knockout-connectors" xmlns="http://www.w3.org/2000/svg"></svg>';
    html += '</div>'; // .knockout-bracket
    html += '<span class="knockout-scroll-hint" aria-hidden="true">← Faites défiler pour voir l’arbre complet →</span>';
    html += '</div>'; // .knockout-bracket-wrapper

    container.innerHTML = html;

    const wrapper = container.querySelector('.knockout-bracket-wrapper');
    if (wrapper) {
      drawConnectors(wrapper);
      observeResize(wrapper);
    }
  }

  function observeResize(wrapper) {
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => drawConnectors(wrapper));
      ro.observe(wrapper);
    } else {
      window.addEventListener('resize', () => drawConnectors(wrapper), { passive: true });
    }
  }

  function drawConnectors(wrapper) {
    const bracket = wrapper.querySelector('.knockout-bracket');
    const svg = wrapper.querySelector('.knockout-connectors');
    if (!bracket || !svg) return;

    const cols = bracket.querySelectorAll('.knockout-col');
    if (cols.length < 5) return;

    const bracketRect = bracket.getBoundingClientRect();
    const paths = [];

    function matchCenter(matchEl) {
      const rect = matchEl.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - bracketRect.left,
        y: rect.top + rect.height / 2 - bracketRect.top,
      };
    }

    // Connect standard rounds 0→1, 1→2, 2→3
    for (let round = 0; round < 3; round++) {
      const sources = cols[round].querySelectorAll('.knockout-match');
      const targets = cols[round + 1].querySelectorAll('.knockout-match');
      for (let t = 0; t < targets.length; t++) {
        const target = matchCenter(targets[t]);
        for (let s = 0; s < 2; s++) {
          const source = matchCenter(sources[t * 2 + s]);
          const midX = (source.x + target.x) / 2;
          paths.push(`M ${source.x} ${source.y} H ${midX} V ${target.y} H ${target.x}`);
        }
      }
    }

    // Demis → finale et 3ème place
    const semiMatches = cols[3].querySelectorAll('.knockout-match');
    const finalCol = cols[4];
    const finalMatch = finalCol.querySelector('.final-match');
    const thirdMatch = finalCol.querySelector('.third-place-match');

    if (finalMatch && thirdMatch) {
      const finalCenter = matchCenter(finalMatch);
      const thirdCenter = matchCenter(thirdMatch);
      semiMatches.forEach((semi) => {
        const source = matchCenter(semi);
        const midX = (source.x + finalCenter.x) / 2;
        paths.push(`M ${source.x} ${source.y} H ${midX} V ${finalCenter.y} H ${finalCenter.x}`);
        paths.push(`M ${source.x} ${source.y} H ${midX} V ${thirdCenter.y} H ${thirdCenter.x}`);
      });
    }

    const width = Math.max(bracket.scrollWidth, bracketRect.width);
    const height = Math.max(bracket.scrollHeight, bracketRect.height);

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.width = width + 'px';
    svg.style.height = height + 'px';
    svg.innerHTML = paths.map((d) => `<path d="${d}" />`).join('');
  }

  window.renderKnockoutBracket = renderWorldCupBracket;

  if (typeof chartMatches !== 'undefined' && chartMatches && chartMatches.length) {
    renderWorldCupBracket(chartMatches);
  }
})();
