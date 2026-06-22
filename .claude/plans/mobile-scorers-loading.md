# Plan : corriger l'affichage des buteurs et optimiser le chargement mobile

## Problème constaté
- En mode mobile, les **buteurs** ne s'affichent pas (ou partiellement) dans les cartes de match et dans la section **Tous les buteurs**.
- Le **chargement des matchs** n'est pas optimal sur mobile : le fallback statique apparaît vite, mais la bascule vers les données live/terminées de `worldcup26.ir` semble lente ou ne met pas à jour les buteurs.

## Cause racine identifiée
1. **Les buteurs ne sont pas re-rendus quand seules les données de buteurs arrivent.**
   - Le rendu de classements / phase finale / buteurs est conditionné par `matchesResultsChanged(previousMatches, chartMatches)`.
   - Cette fonction compare uniquement `id`, `status`, `finished`, `time_elapsed` et les scores finaux.
   - Le fallback statique 2026 contient déjà les scores finaux des matchs terminés, mais **pas les buteurs** (ou seulement 4 matchs dans `STATIC_FALLBACK_GOALS`).
   - Quand l'API `worldcup26.ir` renvoie les mêmes scores, `matchesResultsChanged` retourne `false` et `renderAllScorers()` n'est jamais appelé avec les vrais buteurs.

2. **Le fetch des buteurs n'est pas déclenché pour la CdM 2026.**
   - `fetchWorldcup26Scorers()` n'est appelé que dans la branche "autres éditions".
   - Pour 2026, les buteurs dépendent exclusivement du parsing de `fetchWorldcup26Matches()` via `parseWorldcup26Payload()`.
   - Si ce payload vient d'un cache périmé ou du fallback statique, la map `wc26Scorers` reste vide.

3. **Timeouts trop agressifs sur connexion mobile.**
   - Le frontend coupe l'appel au proxy à 15 s, alors que le proxy côté PHP attend jusqu'à 30 s.
   - Sur mobile lent, l'appel frais peut échouer prématurément et laisser le fallback statique (sans buteurs).

4. **Pas d'état de chargement visuel.**
   - L'utilisateur mobile ne sait pas si les données sont en cours de chargement ou si le site est "bloqué" sur le fallback.

## Objectif
- Faire en sorte que les buteurs s'affichent dès que les données API les contiennent, même si les scores n'ont pas changé.
- Améliorer la robustesse du chargement sur mobile (timeouts, indicateur, fallback propre).
- Conserver les optimisations de rendu incrémental existantes.

## Approche choisie

### 1. Détecter les changements de buteurs
- Étendre `matchesResultsChanged()` pour comparer également les listes de buteurs (nombre et identités/minutes) entre l'ancien et le nouveau tableau de matchs.
- Si les buteurs ont changé, forcer l'appel à `renderRankingsAndScorers()`.

### 2. Forcer le rendu des buteurs à la bascule fallback → API
- Ajouter un paramètre `source` dans `applyMatches()`.
- Quand `source` passe de `'fallback'` (ou `undefined`) à `'worldcup26.ir'`, forcer `renderRankingsAndScorers()` une fois, car l'API est la source de vérité pour les buteurs.

### 3. Appeler le fetch des buteurs pour 2026 aussi
- Dans la branche 2026 de `fetchAndRenderMatches`, appeler `fetchWorldcup26Scorers()` en parallèle de `fetchWorldcup26Matches()`.
- Cela donne une deuxième chance de peupler `wc26Scorers` même si le payload matchs ne les contient pas.

### 4. Adapter les timeouts pour mobile
- Augmenter le timeout frontend du proxy à 25 s (le proxy PHP timeout à 30 s).
- Garder un timeout plus court (10 s) pour le fetch direct `worldcup26.ir/get/games` dans `fetchWorldcup26Scorers()` car c'est un second canal.

### 5. Ajouter un skeleton / état de chargement mobile
- Dans `#matches-list`, afficher un état skeleton léger pendant le premier chargement, remplacé par les cartes dès que le fallback ou les données API arrive.
- Cela évite l'impression d'une page vide sur mobile avant le rendu.

### 6. Nettoyage et robustesse
- Vider `wc26Scorers` si le payload parsé est vide, pour ne pas afficher des buteurs obsolètes.
- S'assurer que `renderAllScorers()` s'exécute même si `chartMatches` est vide mais que `wc26Scorers` contient des données (cas théorique de fetch indépendant).

## Fichiers modifiés
- `index.html` uniquement.

## Détails d'implémentation

### `matchesResultsChanged(oldMatches, newMatches)`
- Conserver la comparaison existante.
- Ajouter une comparaison rapide des buteurs : pour chaque match, compter le nombre de buts et, si différent, retourner `true`.
- Optionnel : comparer une empreinte simple (`scorer|minute|side`) pour détecter aussi les corrections de buteurs.

### `applyMatches(matches, isFallback, source)`
- Accepter `source` en troisième argument (`'fallback'`, `'worldcup26.ir'`, `'football-data'`).
- Définir une variable `hadFallbackRender` globale.
- Si `source === 'worldcup26.ir'` et que le rendu précédent était un fallback, forcer `renderRankingsAndScorers()` dans le `requestAnimationFrame`.
- Sinon, conserver la logique conditionnée par `matchesResultsChanged()` (qui incluera désormais les buteurs).

### `fetchAndRenderMatches(wc, opts)`
- Dans la branche 2026 :
  ```js
  applyMatches(fallback, true, 'fallback');
  // Lancer les deux appels en parallèle
  Promise.all([
    fetchWorldcup26Matches({ preferFresh }),
    fetchWorldcup26Scorers()
  ]).then(([wc26Matches]) => {
    if (wc26Matches && wc26Matches.length) {
      applyMatches(wc26Matches, false, 'worldcup26.ir');
    }
  });
  ```
- Supprimer l'appel `await fetchWorldcup26Scorers()` de la branche non-2026 ou le laisser inchangé.

### Timeout
- `fetchWorldcup26Matches` : `fetchWithTimeout(url, { cache: 'no-store' }, 25000)`.
- `fetchWorldcup26Scorers` : garder 10000 ms.

### Skeleton mobile
- Ajouter une classe CSS `.matches-skeleton` avec 3 barres animées.
- Dans `fetchAndRenderMatches`, si `#matches-grid` est vide au démarrage, injecter le skeleton.
- Le retirer dès que `renderMatches()` est appelé.

## Vérification
- Ouvrir le site en mode mobile (DevTools ou vrai téléphone).
- Aller dans la section **Buteurs** : les buteurs des matchs terminés doivent s'afficher.
- Vérifier qu'un match terminé dont le score statique == score API affiche quand même ses buteurs.
- Vérifier que le skeleton disparaît et que les cartes de matchs apparaissent rapidement.
- Sur une connexion lente simulée (3G), vérifier que le site finit par charger les données live sans timeout prématuré.

## Non-régression
- Fallback statique 2026 toujours affiché si l'API échoue.
- Onglets En cours / À venir / Terminés conservés.
- Classements, phase finale et charts mis à jour quand les résultats changent.
- Pas de re-render complet inutile quand seule la minute live change.

## Déploiement
1. `git add index.html .claude/plans/mobile-scorers-loading.md` puis commit.
2. `git push origin main`.
3. Se connecter au serveur o2switch et faire `git pull origin main`.
