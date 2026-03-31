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
    Lit un PDF d'inventaire et extrait les quantités manuscrites
    via OCR (EasyOCR + PyMuPDF + OpenCV).

    Paramètres :
        pdf_input : chemin string vers le PDF, ou objet fichier Django

    Retourne :
        [{'produit_mere': str, 'designation': str, 'qte_physique': int}, ...]
    """
    try:
        import easyocr
        import numpy as np
        import cv2
        import fitz
        from io import BytesIO
        from django.core.files.uploadedfile import InMemoryUploadedFile

        reader = easyocr.Reader(['fr', 'en'], gpu=False)

        if isinstance(pdf_input, str):
            with open(pdf_input, 'rb') as f:
                pdf_bytes = f.read()
        elif isinstance(pdf_input, InMemoryUploadedFile):
            pdf_bytes = pdf_input.read()
        else:
            pdf_bytes = pdf_input.read()

        doc = fitz.open(stream=BytesIO(pdf_bytes), filetype="pdf")
        results = []

        for page_num in range(doc.page_count):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=300)
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
                pix.height, pix.width, pix.n
            )
            img_cv = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            lines = _extract_table_ocr(img_cv, reader)

            for line in lines:
                if len(line) >= 4:
                    produit    = line[0].strip()
                    designation = line[1].strip()
                    qte_theo   = re.sub(r'[^0-9]', '', line[2])
                    qte_phy    = _clean_quantity(" ".join(line[3:]).strip())

                    if qte_phy and qte_phy != qte_theo:
                        results.append({
                            'produit_mere': produit,
                            'designation':  designation,
                            'qte_physique': int(qte_phy),
                        })
                        logger.info(f"OCR: {produit} | {designation} → {qte_phy}")

        doc.close()
        return results

    except ImportError as e:
        logger.error(f"Dépendance OCR manquante : {e}")
        return []
    except Exception as e:
        logger.error(f"Erreur OCR : {e}")
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
                inv = Inventaire.objects.filter(
                    historique_id=historique_id,
                    produit__product__name=item['produit_mere'],
                    produit__designation=item['designation'],
                ).first()

                if inv:
                    inv.quantite_phy = item['qte_physique']
                    inv.save(update_fields=['quantite_phy'])
                    updated += 1
                else:
                    errors.append(
                        f"Inventaire non trouvé : {item['produit_mere']} / {item['designation']}"
                    )
            except Exception as e:
                errors.append(str(e))

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
        return {
            "detected": 0,
            "updated":  0,
            "message":  f"Erreur lors du traitement : {str(e)}"
        }