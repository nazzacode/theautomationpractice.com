---
title: "Site"
type: docs
tags: [site]
---
# theautomationpractice.com — production

Built output of `lab/` (v2, 2026-09-27). **Don't edit here** — edit `lab/sections/`, run `python lab/build.py`, then promote:

```bash
cp lab/{index,about,careers,contact}.html site/ && cp -r lab/{css,js,fonts} site/ && cp -r lab/img/logos site/img/
sed -i '/name="robots" content="noindex"/d' site/*.html
scripts/deploy_site.sh   # splits site/ → public Pages repo; live in ~30s
```

Kept here, not in lab: `CNAME`, `.nojekyll`, `.github/workflows/pages.yml`. v1 is in git history (`f423acb`).
