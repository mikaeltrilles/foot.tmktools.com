/* ═══════════════════════════════════════════════════════════════════════════
   BRACKET COUPE DU MONDE — Phase finale (projection)
   Remplace le rendu horizontal basique par un arbre de tournoi SVG.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  function safeFlagCode(team) {
    if (typeof flagCodeForTeam === 'function') return flagCodeForTeam(team);
    return 'xx';
  }

  function safeComputeBracket(matches) {
    if (typeof computeKnockoutBracket === 'function') return computeKnockoutBracket(matches);
    return null;
  }

  function teamHTML(team) {
    const isPlaceholder = team.type === 'placeholder';
    const label = isPlaceholder ? team.label : (team.label || team.team || '—');
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
      <article class="knockout-match ${extraClass || ''}" role="listitem">
        ${teamHTML(match.home)}
        ${teamHTML(match.away)}
        <div class="knockout-match-note">${note}</div>
      </article>`;
  }

  function renderWorldCupBracket(matches) {
    const container = document.getElementById('knockout-grid');
    if (!container) return;

    const bracket = safeComputeBracket(matches);
    if (!bracket || !bracket.rounds || bracket.rounds.length < 6) {
      container.innerHTML =
        '<p class="knockout-empty">Le tableau de phase finale sera disponible une fois les groupes constitués.</p>';
      return;
    }

    const rounds = bracket.rounds;

    let html = '<div class="knockout-bracket-wrapper">';
    html += '<div class="knockout-bracket">';

    // Rounds 0..3 : 16èmes → 8èmes → quarts → demis
    for (let i = 0; i < 4; i++) {
      html += `<div class="knockout-col" data-round="${i}">
        <div class="knockout-round-title">${rounds[i].name}</div>
        <div class="knockout-matches">
          ${rounds[i].matches.map((m) => matchHTML(m, '', 'Vainqueur simulé')).join('')}
        </div>
      </div>`;
    }

    // Final column : finale + 3ème place
    html += `<div class="knockout-col final-col" data-round="4">
      <div class="final-block">
        <div class="knockout-round-title">${rounds[4].name}</div>
        ${matchHTML(rounds[4].matches[0], 'final-match', '🏆 Vainqueur simulé')}
      </div>
      <div class="third-block">
        <div class="knockout-round-title">${rounds[5].name}</div>
        ${matchHTML(rounds[5].matches[0], 'third-place-match', '3ème place simulée')}
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

  // Si les données sont déjà chargées au moment où ce script s'exécute,
  // forcer un re-rendu immédiat avec le nouveau bracket.
  if (typeof chartMatches !== 'undefined' && chartMatches && chartMatches.length) {
    renderWorldCupBracket(chartMatches);
  }
})();
