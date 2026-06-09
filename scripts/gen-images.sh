#!/bin/bash
# Genera las imágenes faltantes con Higgsfield (GPT Image 2), en paralelo.
cd /Users/juanchiansaldi/Desktop/We || exit 1
OUT=platform/public/assets/img/productos
STYLE="Dark moody editorial product photography, deep charcoal near-black background, dramatic chiaroscuro side lighting, subtle crimson red accent glow, premium wine boutique aesthetic, shallow depth of field, photorealistic, ultra detailed, centered composition, no text, no watermark, no readable labels"

gen() {
  local name="$1"; local prompt="$2"
  local j="/tmp/hg-$name.json"
  higgsfield generate create gpt_image_2 --prompt "$prompt $STYLE" --aspect_ratio 1:1 --wait --wait-timeout 12m --json > "$j" 2>/dev/null
  local url=$(grep -oE 'https://[^"]+\.(png|webp|jpg|jpeg)' "$j" | head -1)
  if [ -z "$url" ]; then echo "✗ $name (sin URL)"; return; fi
  curl -s "$url" -o "/tmp/$name.png" && cwebp -quiet -q 82 -resize 1000 0 "/tmp/$name.png" -o "$OUT/$name.webp" && echo "✓ $name.webp $(du -h "$OUT/$name.webp" | cut -f1)"
}

# tintos
gen bonarda "A bottle of red wine with an elegant unbranded dark label beside a glass of juicy violet-red wine, fresh cherries and violets, on a dark slate surface." &
gen blend-tinto "A premium bottle of red blend wine with a sophisticated embossed dark label, a glass of deep red wine, a small oak barrel softly blurred behind, warm cellar light." &
gen syrah "A bottle of Syrah red wine with a dark moody label beside a glass of dark plum-red wine, black pepper and ripe plums, smoky atmosphere on a dark surface." &
gen pinot-noir "An elegant slender bottle of Pinot Noir red wine with a refined pale label, a glass of translucent ruby red wine, fresh strawberries, delicate and airy on a dark surface." &
gen cabernet "A classic bottle of Cabernet Sauvignon red wine with a dark embossed label, a glass of deep red wine, blackcurrants, firm and serious mood on a dark stone surface." &
wait
# blancos
gen chardonnay "A bottle of Chardonnay white wine with a cream elegant label, a glass of golden white wine, an apple and a sprig, creamy buttery mood, on a dark surface with warm light." &
gen sauvignon "A bottle of Sauvignon Blanc white wine with a fresh minimalist label, a glass of pale green-gold wine, lime and grapefruit slices, crisp and refreshing, on a dark surface." &
gen espumante-rosado "An elegant bottle of rosé sparkling wine beside a flute of pink sparkling wine with fine bubbles, strawberries and rose petals, festive on a dark reflective surface." &
# fiambres / conservas
gen jamon "An artisanal cured ham leg with thin slices of jamon arranged on a dark slate board, deep red color, rustic gourmet charcuterie, dramatic lighting." &
gen aceitunas "A glass jar of green and black olives in herb brine with a small bowl of olives beside it, rosemary sprigs, mediterranean gourmet, on a dark wooden surface." &
wait
# dulces
gen alfajores "A small stack of artisanal cornstarch alfajores filled with dulce de leche and rolled in coconut on a dark plate, soft powdered sugar, homemade dessert, warm lighting." &
gen mermelada "A glass jar of artisanal red berry jam with a spoon and fresh raspberries and strawberries around it, rustic homemade preserve, on a dark wooden surface." &
# caja
gen caja-vinos "A premium wooden gift box containing two wine bottles, a wedge of cheese, a cured salami and a jar of olives, elegant gourmet hamper presentation, dark moody lighting." &
wait
echo "=== generación terminada ==="
ls "$OUT" | wc -l
