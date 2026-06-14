# foot.tmktools.com

Site de suivi live de la Coupe du Monde de Football FIFA 2026 et au-delà.

## Fonctionnalités
- Scores en temps réel (mis à jour toutes les 30 secondes pendant les matchs)
- Tableau complet des équipes, stades et pays organisateurs
- Palmarès historique avec étoiles
- Compte à rebours vers les prochaines Coupes du Monde
- Mode sombre / clair
- Détection automatique de l'édition en cours (2026, 2030, 2034...)

## Données
- Coupe du Monde 2026 : [worldcup26.ir](https://worldcup26.ir) API (données live, scores et buteurs)
- Autres éditions : [football-data.org](https://www.football-data.org) API v4
- Données statiques embarquées en fallback

## Déploiement
Hébergé sur `foot.tmktools.com` via SSH.

## Structure
```
foot.tmktools.com/
├── index.html          ← page principale (tout-en-un)
├── .gitignore
├── README.md
└── assets/
    └── og-image.png    ← image OpenGraph (1200×630)
```

## Stack
- HTML5 statique
- JavaScript vanilla ES2024
- CSS custom properties
- Chart.js 4.x via CDN
- Lucide icons via CDN
