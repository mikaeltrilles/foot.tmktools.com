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
  echo "✅ Déployé avec succès : $(date)"
ENDSSH

echo "✅ foot.tmktools.com est en ligne !"
