#!/usr/bin/env bash
# Wait until scout-data has scout/<slug>/places.json. Usage: wait-scout.sh <slug>
cd /home/user/ff-content-demo-factory || exit 1
for i in $(seq 1 120); do
  git fetch -q origin scout-data 2>/dev/null || true
  if git cat-file -e "origin/scout-data:scout/$1/places.json" 2>/dev/null; then
    echo "READY $1"; exit 0
  fi
  sleep 20
done
echo "TIMEOUT $1"
