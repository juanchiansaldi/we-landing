# We · Cava & Gourmet — Landing

Landing de **We · Cava & Gourmet**, vinería y tienda gourmet en Crespo, Entre Ríos.
Single-file (`index.html`) + carpeta de frames + librerías por CDN. Cero build, listo para GitHub Pages.

## Stack

- **HTML/CSS/JS** embebido en `index.html` (un solo archivo).
- **GSAP + ScrollTrigger + Lenis** por CDN (con Subresource Integrity).
- Secuencia de **193 frames WebP** (`./frames/we-0001.webp … we-0193.webp`) dibujada en `<canvas>`.
- Tipografías Fraunces + DM Sans (Google Fonts).
- Todo respeta `prefers-reduced-motion` (sin smooth-scroll ni scrubs, contenido visible).

## Estructura

```
.
├── index.html              # la landing entera (HTML + CSS + JS embebidos)
├── .nojekyll               # evita que Pages ignore carpetas
├── assets/
│   ├── frames/             # we-0001.webp … we-0193.webp (secuencia, ≈2.9 MB)
│   ├── favicon/            # favicon.ico, png, apple-touch, site.webmanifest
│   ├── img/                # eventos.webp
│   └── brand/              # we-isotipo.svg, we-logotipo.svg (fuente del logo)
└── .github/workflows/deploy.yml   # deploy CI opcional
```

> El material pesado no desplegable (video original, manuales, PNGs sin optimizar)
> queda en `_source/`, que está en `.gitignore` y no se versiona.
```

## Correr en local

Necesitás un servidor estático (no abrir el `file://` directo, por la carga de frames y CORS de los CDN):

```bash
python3 -m http.server 8000
# luego abrir http://localhost:8000
```

## Optimización de frames

Los 193 frames originales (JPG 1280×720) se convirtieron a WebP con calidad 80:

```bash
brew install webp   # cwebp
for f in _source/frames-jpg/frame_*.jpg; do
  n=$(echo "$f" | sed -E 's/.*frame_0*([0-9]+)\.jpg/\1/')
  cwebp -q 80 -m 6 -quiet "$f" -o "$(printf 'assets/frames/we-%04d.webp' "$n")"
done
```

Resultado: **5.3 MB → 2.9 MB (−44 %)**. Mantienen 1280×720 (ya por debajo de 1600 px, no se reescalan).

## Deploy en GitHub Pages

### Opción A — Modo branch (rama main / carpeta raíz)

1. Crear el repo y pushear (ver comandos abajo).
2. En GitHub: **Settings → Pages**.
3. En **Build and deployment → Source**, elegir **Deploy from a branch**.
4. **Branch:** `main` · **Folder:** `/ (root)` → **Save**.
5. La URL final será: `https://<usuario>.github.io/<repo>/`

### Opción B — GitHub Actions (CI en cada push)

1. En **Settings → Pages → Source**, elegir **GitHub Actions**.
2. El workflow `.github/workflows/deploy.yml` ya publica en cada push a `main`.

### Comandos de git

```bash
git init
git add .
git commit -m "We landing: scroll-linked animations + secuencia 193 frames"
git branch -M main

# Con GitHub CLI:
gh repo create we-landing --public --source=. --remote=origin --push

# O manual (si ya creaste el repo vacío en github.com):
git remote add origin https://github.com/<usuario>/we-landing.git
git push -u origin main
```

---

+18 · Beber con moderación · Prohibida la venta a menores de 18 años.
