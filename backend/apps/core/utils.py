import os
import re
import logging
from rest_framework.response import Response

logger = logging.getLogger(__name__)


class StandardResponse:
    def __init__(self, success=True, message="", data=None):
        self.success = success
        self.message = message
        self.data = data

    def to_dict(self):
        return {
            "success": self.success,
            "message": self.message,
            "data": self.data
        }

    @classmethod
    def render(cls, data=None, message="", status_code=200):
        success = status_code < 400
        return Response(
            {
                "success": success,
                "message": message,
                "data": data,
            },
            status=status_code
        )


# ─── OCR ────────────────────────────────────────────────────

def process_pdf(pdf_input):
    """
    Lit un PDF d'inventaire et extrait les quantités physiques.
    Supporte les PDF textuels (générés) et les scans manuscrits (OCR).
    """
    try:
        import fitz  # PyMuPDF
        from io import BytesIO
        from django.core.files.uploadedfile import InMemoryUploadedFile

        if isinstance(pdf_input, str):
            with open(pdf_input, 'rb') as f:
                pdf_bytes = f.read()
        elif isinstance(pdf_input, InMemoryUploadedFile):
            pdf_bytes = pdf_input.read()
        else:
            pdf_bytes = pdf_input.read()

        doc = fitz.open(stream=BytesIO(pdf_bytes), filetype="pdf")
        results = []

        # ── 1. Extraction texte structurée (PDF généré par ReportLab) ────────
        # get_text("words") retourne [(x0,y0,x1,y1, "mot", page, block, line, word), ...]
        # On regroupe les mots par ligne (même y0 arrondi à 5px de tolérance)
        all_words = []
        for page in doc:
            words = page.get_text("words")
            all_words.extend(words)

        if all_words:
            # Grouper par Y (tolérance de 5px pour les lignes du tableau)
            rows_by_y = {}
            for w in all_words:
                x0, y0, x1, y1, word = w[0], w[1], w[2], w[3], w[4]
                # Arrondir y à la dizaine la plus proche pour regrouper la même ligne
                y_key = round(y0 / 5) * 5
                if y_key not in rows_by_y:
                    rows_by_y[y_key] = []
                rows_by_y[y_key].append((x0, word))

            # Trier les lignes par position verticale
            for y_key in sorted(rows_by_y.keys()):
                row_words = sorted(rows_by_y[y_key], key=lambda w: w[0])  # trier par X
                cells = [w[1] for w in row_words]

                logger.debug(f"Ligne PDF: {cells}")

                # Chercher les lignes de données : [ID, Produit, Désignation, Théo, Phy, Écart]
                # La première cellule doit être un entier (l'ID inventaire)
                if len(cells) >= 5 and cells[0].isdigit():
                    try:
                        inv_id = int(cells[0])
                        # Les dernières cellules sont des nombres (théo, phy, écart)
                        # On cherche les chiffres depuis la fin
                        # Format : [ID, ...Produit..., ...Désignation..., Théo, Phy, Écart]
                        # On prend les 3 derniers comme nombres
                        last3 = cells[-3:]
                        if all(re.match(r'^-?\d+$', c.replace(',', '.').split('.')[0]) for c in last3):
                            qte_theo = int(re.sub(r'[^0-9]', '', last3[0]) or '0')
                            qte_phy  = int(re.sub(r'[^0-9]', '', last3[1]) or '0')
                            # Les cellules du milieu forment le produit et la désignation
                            middle = cells[1:-3]
                            # Heuristique : si >= 2 mots au milieu, le 1er = produit, reste = désignation
                            produit     = middle[0] if middle else ''
                            designation = ' '.join(middle[1:]) if len(middle) > 1 else ''
                            results.append({
                                'id_inventaire': inv_id,
                                'produit_mere':  produit,
                                'designation':   designation,
                                'qte_physique':  qte_phy,
                            })
                            logger.info(f"Extrait: ID={inv_id} | {produit} | {designation} | Phy={qte_phy}")
                    except (ValueError, IndexError) as e:
                        logger.debug(f"Ligne ignorée: {cells} — {e}")

        if results:
            doc.close()
            logger.info(f"Extraction texte directe réussie : {len(results)} lignes trouvées.")
            return results

        # ── 2. Fallback OCR pour les scans manuscrits ─────────────────────────
        logger.info("Pas de texte détecté, démarrage de l'OCR (peut être long sur CPU)...")
        import easyocr
        import numpy as np
        import cv2

        reader = easyocr.Reader(['fr', 'en'], gpu=False)

        for page_num in range(doc.page_count):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=300)
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
            img_cv = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            lines = _extract_table_ocr(img_cv, reader)

            for line in lines:
                if len(line) >= 4:
                    id_inv = None
                    if line[0].strip().isdigit() and len(line) >= 5:
                        id_inv      = int(line[0].strip())
                        produit     = line[1].strip()
                        designation = line[2].strip()
                        qte_phy     = _clean_quantity(" ".join(line[4:]).strip())
                    else:
                        produit     = line[0].strip()
                        designation = line[1].strip()
                        qte_phy     = _clean_quantity(" ".join(line[3:]).strip())

                    if qte_phy:
                        results.append({
                            'id_inventaire': id_inv,
                            'produit_mere':  produit,
                            'designation':   designation,
                            'qte_physique':  int(qte_phy),
                        })
                        logger.info(f"OCR: ID {id_inv} | {produit} → Phy: {qte_phy}")

        doc.close()
        return results

    except ImportError as e:
        logger.error(f"Dépendance OCR manquante : {e}")
        return []
    except Exception as e:
        logger.error(f"Erreur process_pdf : {e}", exc_info=True)
        return []


def _extract_table_ocr(img, reader):
    """Extrait les lignes d'un tableau dans une image via EasyOCR."""
    import cv2
    import numpy as np

    gray   = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 31, 11
    )
    processed = cv2.dilate(thresh, np.ones((2, 2), np.uint8), iterations=1)

    ocr_results  = reader.readtext(processed, detail=1, paragraph=False)
    lines, current_line, last_y = [], [], -1
    tolerance = 30

    for (bbox, text, conf) in ocr_results:
        if conf < 0.3:
            continue
        y_center = (bbox[0][1] + bbox[2][1]) // 2
        x_center = (bbox[0][0] + bbox[2][0]) // 2

        if last_y == -1 or abs(y_center - last_y) <= tolerance:
            current_line.append((text.strip(), x_center))
        else:
            current_line.sort(key=lambda x: x[1])
            lines.append([t for t, _ in current_line])
            current_line = [(text.strip(), x_center)]
        last_y = y_center

    if current_line:
        current_line.sort(key=lambda x: x[1])
        lines.append([t for t, _ in current_line])

    return [l for l in lines if len(l) >= 4 and "Produit" not in l[0]]


def _clean_quantity(text):
    cleaned = re.sub(r'[^0-9]', '', text)
    return cleaned if cleaned else None


def _cleanup(file_path):
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        logger.warning(f"Impossible de supprimer {file_path} : {e}")


# ─── Traitement PDF (synchrone) ─────────────────────────────

def process_pdf_async(file_path, historique_id, user_id):
    """
    Traite un PDF d'inventaire uploadé :
    1. Lance l'OCR via process_pdf()
    2. Met à jour les quantités physiques dans Inventaire
    3. Supprime le fichier temporaire

    Paramètres :
        file_path     : chemin absolu vers le PDF temporaire
        historique_id : ID de l'HistoriqueInventaire concerné
        user_id       : ID de l'utilisateur (pour logs futurs)

    Retourne :
        {"detected": int, "updated": int, "sample": list, "message": str}

    Note : pour la version Celery asynchrone, décorer avec @shared_task
    et déplacer dans tasks.py.
    """
    try:
        from apps.stock.models import Inventaire

        results = process_pdf(file_path)

        if not results:
            _cleanup(file_path)
            return {
                "detected": 0,
                "updated": 0,
                "message": "Aucune donnée manuscrite détectée dans le PDF."
            }

        updated = 0
        errors  = []

        for item in results:
            try:
                inv = None
                
                # 1. Match parfait par ID d'inventaire
                if item.get('id_inventaire'):
                    inv = Inventaire.objects.filter(
                        id=item['id_inventaire'], 
                        historique_id=historique_id
                    ).first()
                
                # 2. Fallback par nom et designation
                if not inv:
                    prod_name = item.get('produit_mere', '').strip()
                    designation = item.get('designation', '').strip()
                    
                    if prod_name and designation:
                        inv = Inventaire.objects.filter(
                            historique_id=historique_id,
                            produit__product__name__icontains=prod_name,
                            produit__designation__icontains=designation,
                        ).first()

                    # 3. Tentative de repli : seulement par la désignation si unique
                    if not inv and designation:
                        inv_alt = Inventaire.objects.filter(
                            historique_id=historique_id,
                            produit__designation__icontains=designation
                        )
                        if inv_alt.count() == 1:
                            inv = inv_alt.first()

                if inv:
                    inv.quantite_phy = item['qte_physique']
                    inv.save(update_fields=['quantite_phy'])
                    updated += 1
                else:
                    errors.append(f"Match impossible pour ID {item.get('id_inventaire')} / {item.get('produit_mere')} / {item.get('designation')}")
            except Exception as e:
                errors.append(str(e))

        # 3. Créer une notification pour l'utilisateur
        try:
            from apps.notifications.models import Notification
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(id=user_id)
            
            Notification.creer(
                utilisateur=user,
                titre="Analyse OCR terminée",
                data={
                    "model_name": "Inventaire",
                    "objet_nom": f"Fichier traité ({updated} produits mis à jour)",
                    "notif": "terminée",
                },
                priorite=1
            )
        except Exception as e:
            logger.error(f"Erreur notification OCR : {e}")

        _cleanup(file_path)

        result = {
            "detected": len(results),
            "updated":  updated,
            "sample":   results[:5],
            "message":  f"{updated}/{len(results)} quantités mises à jour."
        }
        if errors:
            result["errors"] = errors

        return result

    except Exception as e:
        _cleanup(file_path)
        logger.error(f"process_pdf_async erreur : {e}")
        
        try:
            from apps.notifications.models import Notification
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(id=user_id)
            Notification.creer(
                utilisateur=user,
                titre="Erreur Analyse OCR",
                data={
                    "model_name": "Inventaire",
                    "objet_nom": "Le fichier PDF",
                    "notif": f"a rencontré une erreur lors de l'analyse : {str(e)}",
                },
                priorite=2
            )
        except:
            pass

        return {
            "detected": 0,
            "updated":  0,
            "message":  f"Erreur lors du traitement : {str(e)}"
        }
    finally:
        try:
            from django.db import connection
            connection.close()
        except:
            pass