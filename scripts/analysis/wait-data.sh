#!/usr/bin/env bash
# Wait until <branch> has <path>. Usage: wait-data.sh <branch> <path>
cd /home/user/ff-content-demo-factory || exit 1
for i in $(seq 1 90); do
  git fetch -q origin "$1" 2>/dev/null || true
  if git cat-file -e "origin/$1:$2" 2>/dev/null; then
    echo "READY $2"; exit 0
  fi
  sleep 20
done
echo "TIMEOUT $2"
