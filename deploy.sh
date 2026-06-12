#!/bin/bash
set -e

echo "🚀 Déploiement foot.tmktools.com..."

# Commit & push local
git add -A
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "Rien à committer"
git push origin main

# Déploiement distant
ssh vote1550@109.234.165.174 << 'ENDSSH'
  cd /var/www/foot.tmktools.com
  git pull origin main
  # Vider les caches
  find /var/cache/nginx -type f -delete 2>/dev/null || true
  php -r "opcache_reset();" 2>/dev/null || true
  # Recharger le serveur web
  sudo systemctl reload nginx 2>/dev/null || sudo systemctl reload apache2 2>/dev/null || true
  echo "✅ Déployé avec succès : $(date)"
ENDSSH

echo "✅ foot.tmktools.com est en ligne !"
