ncu -u --dep prod,dev --concurrency 16 -x typescript
sort-package-json
wsl rm -rf node_modules package-lock.json yarn.lock pnpm-lock.yaml
pnpm i
