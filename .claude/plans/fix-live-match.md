# Plan : corriger le match "en cours" erroné avec l'API dayboard

## Problème constaté
- Le projet `foot.tmktools.com` affiche un match terminé dans l'onglet **En cours**, et le vrai match live reste dans **À venir**.
- Cause racine : la source principale `api.football-data.org` retarde les statuts (`SCHEDULED`/`TIMED` alors que le match est déjà commencé ou terminé), et la logique de fallback temporel est buggée (3h fixes, onglet Terminés ne l'écoute pas).

## Objectif
Utiliser l'API `worldcup26.ir` (identique à celle du projet `dayboard`) comme **source principale** pour les matchs de la Coupe du Monde 2026, car elle fournit des champs fiables `finished` + `time_elapsed`.

## Approche choisie
1. **Conserver le frontend mono-fichier** (`index.html`) — pas de backend PHP à ajouter, car le déploiement est statique.
2. **Appeler directement `https://worldcup26.ir/get/games`** depuis le JS (déjà utilisé pour les buteurs, donc CORS autorisé).
3. **Convertir les données** de `worldcup26.ir` vers le format interne attendu par le reste du code (`homeTeam`, `awayTeam`, `score`, `utcDate`, `stage`, `group`, `venue`, `status`, `finished`, `time_elapsed`, etc.).
4. **Pour les autres éditions** (2022, 2030…), conserver `football-data.org` comme source principale.
5. **Améliorer `getMatchEffectiveStatus`** pour prendre en compte les champs `finished`/`time_elapsed` de l'API dayboard, en plus des statuts football-data.
6. **Uniformiser le filtrage des onglets** : l'onglet "Terminés" doit utiliser le statut effectif (pas seulement `m.status === 'FINISHED'`), sinon les matchs terminés via `worldcup26.ir` n'apparaîtront pas.
7. **Conserver les fallbacks** : données statiques 2026 / football-data.org si worldcup26.ir échoue.

## Fichier modifié
- `index.html` uniquement.

## Détails d'implémentation

### Nouvelle fonction `fetchWorldcup26Matches()`
- Appelle `https://worldcup26.ir/get/games`.
- Parse chaque `game` :
  - `home_team_name_en` / `away_team_name_en` → `homeTeam.name`, `awayTeam.name`
  - `home_score` / `away_score` → `score.fullTime.home/away`
  - `local_date` (format `MM/DD/YYYY HH:mm`) → `utcDate` ISO via conversion avec le fuseau du stade
  - `stadium_id` → `venue` via mapping
  - `group` (lettre) → `group` ("Groupe X")
  - `type` → `stage` (`group`→`GROUP_STAGE`, `r16`→`ROUND_OF_16`, etc.)
  - `finished` (`TRUE`/`FALSE`) et `time_elapsed` (`notstarted`, `live`, `finished`, minutes) → champs internes
  - `home_scorers` / `away_scorers` → `goals` (format football-data)
- Retourne un tableau compatible avec `renderMatches`.

### Mise à jour de `fetchAndRenderMatches(wc)`
- Si `wc.year === 2026` :
  1. Appeler `fetchWorldcup26Matches()`.
  2. Si succès : utiliser ces matchs.
  3. Sinon : fallback sur football-data.org, puis fallback statique.
- Sinon : garder le flux football-data.org existant.

### Mise à jour de `getMatchEffectiveStatus(m)`
- Priorité : si `m.finished === true` ou `m.status === 'FINISHED'/'AWARDED'` → `finished`.
- Sinon si `m.time_elapsed` est `live` ou numérique → `live`.
- Sinon si statut football-data `IN_PLAY`/`PAUSED`/`LIVE` → `live`.
- Sinon si `SCHEDULED`/`TIMED` → fallback temporel (conservé mais moins critique).
- Sinon → `upcoming`.

### Mise à jour du filtrage dans `renderMatches`
- `finished` : utiliser `getMatchEffectiveStatus(m) === 'finished'` au lieu de `m.status === 'FINISHED' || m.status === 'AWARDED'`.
- `live` / `upcoming` : inchangés (déjà basés sur `getMatchEffectiveStatus`).

### Mapping stades worldcup26.ir → noms internes
Ajouter un mapping `STADIUM_ID_TO_NAME` pour que `venue` corresponde aux clés existantes de `STADIUM_TIMEZONES` / `STADIUM_CITIES` / `STADIUM_COUNTRIES`.

## Vérification
- Rafraîchir la page ; le match réellement en cours doit apparaître dans **En cours**.
- Le match terminé doit apparaître dans **Terminés**.
- Les onglets doivent basculer automatiquement (`selectBestTab`) vers le bon état.

## Non-régression
- Les buteurs continuent de fonctionner (ils viennent déjà de la même API).
- Le fallback statique 2026 reste opérationnel si l'API est indisponible.
- Les éditions autres que 2026 continuent d'utiliser football-data.org.
