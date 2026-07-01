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

  // Résultats de tirs au but pour les matchs de phase finale terminés à égalité.
  // wcup2026.org ne fournit pas les penalties dans son endpoint public ; football-data.org
  // ne publie pas non plus les 16èmes/8èmes en temps réel. On déclare ici les vainqueurs
  // connus officiellement pour que l'arbre avance. Format : id du match => { home, away }.
  const PENALTY_OVERRIDES = {
    // Allemagne 1-1 Paraguay (TAB 4-5) -> Paraguay qualifié
    73: { home: 4, away: 5 },
  };

  const TOURNAMENT_STRUCTURE = [
    {
      name: '16èmes de finale',
      key: 'ROUND_OF_32',
      // Ordre aligné sur les appariements des 8èmes : deux 16èmes consécutifs
      // alimentent un seul 8ème, afin que les vainqueurs soient face à face
      // dans la colonne suivante et que les connecteurs SVG restent cohérents.
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
      // Chaque 8ème reçoit les vainqueurs des deux 16èmes placés juste au-dessus
      // dans la colonne précédente (ordre naturel du bracket FIFA 2026).
      matches: [
        { id: 88, home: { winnerOf: 72 }, away: { winnerOf: 73 } },
        { id: 89, home: { winnerOf: 74 }, away: { winnerOf: 75 } },
        { id: 90, home: { winnerOf: 76 }, away: { winnerOf: 77 } },
        { id: 91, home: { winnerOf: 78 }, away: { winnerOf: 79 } },
        { id: 92, home: { winnerOf: 80 }, away: { winnerOf: 81 } },
        { id: 93, home: { winnerOf: 82 }, away: { winnerOf: 83 } },
        { id: 94, home: { winnerOf: 84 }, away: { winnerOf: 85 } },
        { id: 95, home: { winnerOf: 86 }, away: { winnerOf: 87 } }
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

  function getRegularTimeScore(match) {
    if (!match || !match.score) return null;
    const s = match.score;
    if (s.regularTime) {
      return {
        home: Number(s.regularTime.home ?? 0),
        away: Number(s.regularTime.away ?? 0),
      };
    }
    // Fallback : si on n'a que le score final et pas de tirs au but, c'est le score régulier
    if (!s.penalties && s.fullTime) {
      return {
        home: Number(s.fullTime.home),
        away: Number(s.fullTime.away),
      };
    }
    return null;
  }

  function getTeamScore(match, side) {
    if (!match || !match.score) return '-';
    const s = match.score;
    if (s.regularTime && s.regularTime.home != null && s.regularTime.away != null) {
      return Number(s.regularTime[side === 'home' ? 'home' : 'away']);
    }
    if (s.fullTime && s.fullTime.home != null && s.fullTime.away != null) {
      return Number(s.fullTime[side === 'home' ? 'home' : 'away']);
    }
    if (Array.isArray(s) && s.length >= 2) {
      return Number(s[side === 'home' ? 0 : 1]);
    }
    return '-';
  }

  function hasPenaltyShootout(match) {
    if (!match || !match.score) return false;
    const s = match.score;
    if (s.duration === 'PENALTY_SHOOTOUT') return true;
    if (s.penalties && s.penalties.home != null && s.penalties.away != null) return true;
    return false;
  }

  function getPenaltyResult(match) {
    if (!hasPenaltyShootout(match)) return null;
    const p = match.score.penalties;
    if (!p || p.home == null || p.away == null) return null;
    const home = Number(p.home);
    const away = Number(p.away);
    if (isNaN(home) || isNaN(away)) return null;
    if (home > away) return 'home';
    if (away > home) return 'away';
    return 'draw';
  }

  function getMatchResult(match) {
    if (!match) return null;

    // Si le score enrichi contient déjà un vainqueur (football-data), on le prend
    if (match.score?.winner === 'home' || match.score?.winner === 'away') return match.score.winner;

    // Tirs au but : vainqueur déterminé par les penalties
    const penResult = getPenaltyResult(match);
    if (penResult && penResult !== 'draw') return penResult;

    // Résultat après prolongation / temps réglementaire
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

    // Match nul sans tirs au but
    return 'draw';
  }

  function isFinished(match) {
    if (!match) return false;
    const status = String(match.status || '').toLowerCase();
    return status === 'finished' || status === 'ft' || match.finished === true || match.finished === 'TRUE';
  }

  function getTeamSideName(match, side) {
    if (!match) return null;
    const teamName = side === 'home'
      ? (match.homeTeam?.name || match.team1)
      : (match.awayTeam?.name || match.team2);
    return teamName || null;
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

  // Un nom d'équipe est un placeholder s'il n'a pas de drapeau connu,
  // ou s'il correspond aux références dynamiques Wxx / Lxx / TBD.
  function looksLikePlaceholder(name) {
    if (!name || name === 'TBD' || name === '—') return true;
    if (/^(W|L)\d+$/i.test(name)) return true;
    if (safeFlagCode(name) === 'xx') return true;
    return false;
  }

  // Résout une référence API de type W74 / L101 en utilisant le résultat du match référencé.
  function resolveApiPlaceholder(name, matchesById) {
    const winMatch = name.match(/^W(\d+)$/i);
    if (winMatch) {
      const refId = parseInt(winMatch[1], 10);
      const refMatch = matchesById[refId];
      if (isFinished(refMatch)) {
        const winner = getMatchWinner(refMatch);
        if (winner) return { type: 'team', label: safeTranslateTeamName(winner) };
      }
      return { type: 'placeholder', label: `Vainqueur ${refId}` };
    }
    const loseMatch = name.match(/^L(\d+)$/i);
    if (loseMatch) {
      const refId = parseInt(loseMatch[1], 10);
      const refMatch = matchesById[refId];
      if (isFinished(refMatch)) {
        const loser = getMatchLoser(refMatch);
        if (loser) return { type: 'team', label: safeTranslateTeamName(loser) };
      }
      return { type: 'placeholder', label: `Perdant ${refId}` };
    }
    return null;
  }

  function getApiTeamOrPlaceholder(apiMatch, side, matchesById) {
    if (!apiMatch) return null;
    // wcup2026.org expose team1 / team2 ; football-data expose homeTeam / awayTeam
    const teamName = side === 'home'
      ? (apiMatch.homeTeam?.name || apiMatch.team1)
      : (apiMatch.awayTeam?.name || apiMatch.team2);
    if (!teamName) return null;
    if (!looksLikePlaceholder(teamName)) {
      return { type: 'team', label: safeTranslateTeamName(teamName) };
    }
    return resolveApiPlaceholder(teamName, matchesById);
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

  function applyPenaltyOverrides(matches) {
    return matches.map(m => {
      const override = PENALTY_OVERRIDES[m.id];
      if (!override || !isFinished(m)) return m;
      const s = m.score;
      const homeScore = Array.isArray(s) ? Number(s[0]) : (s && typeof s === 'object' ? Number(s.fullTime ? s.fullTime.home : s.home) : NaN);
      const awayScore = Array.isArray(s) ? Number(s[1]) : (s && typeof s === 'object' ? Number(s.fullTime ? s.fullTime.away : s.away) : NaN);
      if (isNaN(homeScore) || isNaN(awayScore) || homeScore !== awayScore) return m;
      // On a un match nul terminé avec un résultat de TAB connu
      const newScore = {
        ...(typeof s === 'object' && !Array.isArray(s) ? s : { fullTime: { home: homeScore, away: awayScore } }),
        penalties: override,
        winner: override.home > override.away ? 'home' : 'away',
        duration: 'PENALTY_SHOOTOUT',
      };
      return { ...m, score: newScore };
    });
  }

  function buildLiveBracket(matches) {
    if (!matches || !matches.length) return null;

    matches = applyPenaltyOverrides(matches);

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

    // Construire chaque match du bracket. On privilégie les noms d'équipe
    // fournis par l'API (team1 / team2) car ce sont eux qui reflètent le
    // véritable appariement du tournoi. Les placeholders Wxx/Lxx sont
    // résolus dynamiquement via les résultats des matchs référencés.
    // La structure hardcodée n'est conservée que comme fallback (layout).
    const rounds = TOURNAMENT_STRUCTURE.map(round => ({
      name: round.name,
      key: round.key,
      matches: round.matches.map(m => {
        const apiMatch = matchesById[m.id] || null;
        const builtHome = getApiTeamOrPlaceholder(apiMatch, 'home', matchesById)
          || resolveSlot(m.home, matchesById, m.id, standings, usedThirds);
        const builtAway = getApiTeamOrPlaceholder(apiMatch, 'away', matchesById)
          || resolveSlot(m.away, matchesById, m.id, standings, usedThirds);
        return {
          id: m.id,
          home: builtHome,
          away: builtAway,
          // On garde une trace de la référence d'origine pour propager les vainqueurs
          // lorsque l'API n'a pas encore publié le match suivant.
          homeRef: typeof m.home === 'object' ? m.home : null,
          awayRef: typeof m.away === 'object' ? m.away : null,
          apiMatch
        };
      })
    }));

    // Propager les vainqueurs/perdants déjà connus aux matchs suivants pour afficher
    // le chemin qualificatif dès qu'un résultat est officiel. On prend en compte
    // aussi les références Wxx/Lxx définies dans la structure hardcodée lorsque
    // l'API n'a pas encore publié le match suivant (cas des 8èmes avant l'ouverture
    // officielle de l'API pour ce tour).
    rounds.forEach((round, roundIndex) => {
      round.matches.forEach(m => {
        if (!m.apiMatch || !isFinished(m.apiMatch)) return;
        const winner = getMatchWinner(m.apiMatch);
        const loser = getMatchLoser(m.apiMatch);
        if (!winner) return;

        // Chercher les matchs suivants qui attendent ce résultat
        for (let i = roundIndex + 1; i < rounds.length; i++) {
          rounds[i].matches.forEach(nextMatch => {
            // Référence API si le match est déjà connu de l'API, sinon structure hardcodée
            const nextHomeRef = nextMatch.apiMatch?.team1
              || nextMatch.homeRef
              || (typeof nextMatch.home === 'string' ? nextMatch.home : nextMatch.home?.label);
            const nextAwayRef = nextMatch.apiMatch?.team2
              || nextMatch.awayRef
              || (typeof nextMatch.away === 'string' ? nextMatch.away : nextMatch.away?.label);
            const checkHome = typeof nextHomeRef === 'string' && (nextHomeRef === `W${m.id}` || nextHomeRef === `L${m.id}`);
            const checkAway = typeof nextAwayRef === 'string' && (nextAwayRef === `W${m.id}` || nextAwayRef === `L${m.id}`);

            if (checkHome) {
              const isLoser = nextHomeRef.startsWith('L');
              nextMatch.home = { type: 'team', label: safeTranslateTeamName(isLoser ? loser : winner) };
            }
            if (checkAway) {
              const isLoser = nextAwayRef.startsWith('L');
              nextMatch.away = { type: 'team', label: safeTranslateTeamName(isLoser ? loser : winner) };
            }
          });
        }
      });
    });

    return rounds;
  }

  function teamHTML(team, { score = '-', isWinner = false, penaltyNote = '' } = {}) {
    const isPlaceholder = team.type === 'placeholder';
    const label = team.label || '—';
    const flag = isPlaceholder ? 'xx' : safeFlagCode(label);
    const flagHTML =
      flag !== 'xx'
        ? `<span class="flag-tiny" aria-hidden="true"><img src="https://flagcdn.com/${flag}.svg" alt="" loading="lazy" crossorigin="anonymous"></span>`
        : '<span class="flag-placeholder" aria-hidden="true"></span>';
    const winnerClass = isWinner ? ' winner' : '';
    const winnerIndicator = isWinner ? ' <span aria-hidden="true">✓</span>' : '';
    const penaltyHTML = penaltyNote ? ` <span class="knockout-penalty-note">${penaltyNote}</span>` : '';
    return `
      <div class="knockout-team ${isPlaceholder ? 'placeholder' : 'known'}${winnerClass}">
        <span class="knockout-team-name">${flagHTML} <span>${label}${winnerIndicator}</span></span>
        <span class="knockout-score">${score}${penaltyHTML}</span>
      </div>`;
  }

  function matchHTML(match, extraClass, note) {
    const apiMatch = match.apiMatch;
    const finished = apiMatch && isFinished(apiMatch);
    const penResult = finished ? getPenaltyResult(apiMatch) : null;
    const result = finished ? getMatchResult(apiMatch) : null;
    const hasPenalties = finished && hasPenaltyShootout(apiMatch);
    const penHome = hasPenalties ? apiMatch.score.penalties.home : null;
    const penAway = hasPenalties ? apiMatch.score.penalties.away : null;

    const homeScore = finished ? getTeamScore(apiMatch, 'home') : '-';
    const awayScore = finished ? getTeamScore(apiMatch, 'away') : '-';

    const homeWinner = result === 'home';
    const awayWinner = result === 'away';
    const homePenaltyNote =
      hasPenalties && homeWinner ? `TAB ${penHome}` : '';
    const awayPenaltyNote =
      hasPenalties && awayWinner ? `TAB ${penAway}` : '';

    return `
      <article class="knockout-match ${extraClass || ''}" role="listitem" data-match-id="${match.id || ''}">
        ${teamHTML(match.home, { score: homeScore, isWinner: homeWinner, penaltyNote: homePenaltyNote })}
        ${teamHTML(match.away, { score: awayScore, isWinner: awayWinner, penaltyNote: awayPenaltyNote })}
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
          ${rounds[i].matches.map((m) => {
            const finished = m.apiMatch && isFinished(m.apiMatch);
            const hasPen = finished && hasPenaltyShootout(m.apiMatch);
            const note = finished
              ? (hasPen ? 'Gagné aux tirs au but' : 'Qualifié')
              : 'À déterminer';
            return matchHTML(m, '', note);
          }).join('')}
        </div>
      </div>`;
    }

    // Colonne finale : finale + 3ème place
    const finalRound = rounds.find(r => r.key === 'FINAL');
    const thirdRound = rounds.find(r => r.key === 'THIRD_PLACE');
    html += `<div class="knockout-col final-col" data-round="4">
      <div class="final-block">
        <div class="knockout-round-title">${finalRound ? finalRound.name : 'Finale'}</div>
        ${finalRound ? (() => {
          const m = finalRound.matches[0];
          const finished = m.apiMatch && isFinished(m.apiMatch);
          const hasPen = finished && hasPenaltyShootout(m.apiMatch);
          return matchHTML(m, 'final-match', finished ? (hasPen ? '🏆 Gagné aux tirs au but' : '🏆 Vainqueur') : '🏆 À déterminer');
        })() : ''}
      </div>
      <div class="third-block">
        <div class="knockout-round-title">${thirdRound ? thirdRound.name : '3ème place'}</div>
        ${thirdRound ? (() => {
          const m = thirdRound.matches[0];
          const finished = m.apiMatch && isFinished(m.apiMatch);
          const hasPen = finished && hasPenaltyShootout(m.apiMatch);
          return matchHTML(m, 'third-place-match', finished ? (hasPen ? 'Gagné aux tirs au but' : '3ème place') : '3ème place');
        })() : ''}
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
