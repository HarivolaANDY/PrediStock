# -*- coding: utf-8 -*-
import os, sys, django, re, glob

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

import fitz

# 1. Trouver le dernier PDF temporaire
search_dirs = [
    os.path.join('media', 'temp_pdf'),
    os.path.join('media', 'pdf_uploads'),
    'pdf_uploads',
]

pdf_path = None
for d in search_dirs:
    if os.path.isdir(d):
        pdfs = glob.glob(os.path.join(d, '*.pdf'))
        if pdfs:
            pdf_path = max(pdfs, key=os.path.getmtime)
            break

if not pdf_path:
    print("Aucun PDF trouve. Generez d'abord un inventaire PDF depuis l'interface.")
    sys.exit(1)

print("=" * 60)
print("PDF analyse:", pdf_path)
print("=" * 60)

doc = fitz.open(pdf_path)
print("Pages:", doc.page_count)

# 2. Extraction mot a mot
all_words = []
for page in doc:
    words = page.get_text("words")
    all_words.extend(words)

print("Mots extraits:", len(all_words))

# 3. Regrouper par ligne (y arrondi)
rows_by_y = {}
for w in all_words:
    x0, y0, word = w[0], w[1], w[4]
    y_key = round(y0 / 5) * 5
    if y_key not in rows_by_y:
        rows_by_y[y_key] = []
    rows_by_y[y_key].append((x0, word))

print("\nLignes detactees:", len(rows_by_y))
print("-" * 60)

data_rows = 0
for y_key in sorted(rows_by_y.keys()):
    row_words = sorted(rows_by_y[y_key], key=lambda w: w[0])
    cells = [w[1] for w in row_words]
    is_data = len(cells) >= 5 and cells[0].isdigit()
    tag = "[DATA]" if is_data else "[----]"
    print("  y=%5.0f %s -> %s" % (y_key, tag, cells))
    if is_data:
        data_rows += 1
        # Simuler le parsing
        last3 = cells[-3:]
        all_nums = all(re.match(r'^-?\d+$', c.replace(',', '.').split('.')[0]) for c in last3)
        print("         last3=%s all_nums=%s" % (last3, all_nums))
        if all_nums:
            middle = cells[1:-3]
            produit = middle[0] if middle else ''
            designation = ' '.join(middle[1:]) if len(middle) > 1 else ''
            qte_phy = int(re.sub(r'[^0-9]', '', last3[1]) or '0')
            print("         >> ID=%s Produit=%s Des=%s Phy=%d" % (cells[0], produit, designation, qte_phy))

print("\nLignes de donnees trouvees:", data_rows)

# 4. Tester process_pdf directement
print("\n" + "=" * 60)
print("Test process_pdf()...")
print("=" * 60)
from apps.core.utils import process_pdf
results = process_pdf(pdf_path)
print("Resultats: %d entrees" % len(results))
for r in results:
    print(" ", r)

doc.close()
