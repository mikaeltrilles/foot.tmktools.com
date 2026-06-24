#!/bin/bash
set -e

echo "🚀 Déploiement foot.tmktools.com..."

# Commit & push local
git add -A
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "Rien à committer"
git push origin main

# Déploiement distant
ssh vote1550@109.234.165.174 << 'ENDSSH'
  cd /home/vote1550/foot.tmktools.com
  git stash || true
  git pull origin main

  # Mise à jour du cron pour utiliser le binaire PHP CLI stable d'o2switch
  (crontab -l 2>/dev/null | grep -v 'wcup2026-warm-cache.php'; echo '*/1 * * * * /opt/cpanel/ea-php81/root/usr/bin/php -q ~/foot.tmktools.com/api/wcup2026-warm-cache.php >> ~/foot.tmktools.com/cache/warm.log 2>&1') | crontab -
  echo "✅ Déployé avec succès : $(date)"
ENDSSH

echo "✅ foot.tmktools.com est en ligne !"
