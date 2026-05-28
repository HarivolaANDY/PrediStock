import os
import re
import json
import logging
import urllib.request
import urllib.error
import base64
from difflib import get_close_matches
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


# ─── Constantes ─────────────────────────────────────────────

HEADER_WORDS = {
    "produit", "produits", "qte", "qté", "quantite", "quantité",
    "désignation", "designation", "théo", "theo", "phy", "écart", "ecart",
    "inventaire", "id"
}

FUZZY_MATCH_CUTOFF = 0.55

VISION_PROMPT = """Tu analyses une image d'inventaire manuscrit ou scanné.
Extrais TOUTES les lignes produit visibles et retourne un JSON strict, sans texte autour, sans markdown.

Format attendu :
[{"produit": "NomDuProduit", "qte": 5}, ...]

Règles :
- Ignore les en-têtes (Produits, Qté, Quantité, Inventaire, Désignation, etc.)
- Si tu vois un ID en début de ligne, ajoute "id": N dans l'objet
- Si tu vois une désignation distincte du nom produit, ajoute "designation": "..."
- Pour la quantité, prends la valeur physique (colonne Phy ou la seule colonne numérique)
- Si une valeur est illisible, mets null
- Réponds UNIQUEMENT avec le tableau JSON, rien d'autre"""


# ─── Helper JSON ─────────────────────────────────────────────

def _parse_vision_json(raw: str) -> list:
    """Parse la réponse JSON brute d'un modèle Vision."""
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    raw = re.sub(r"\s*```$", "", raw).strip()

    try:
        items = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"Vision JSON invalide : {e}\nRéponse brute : {raw!r}")
        return []

    results = []
    for item in items:
        produit = str(item.get("produit") or "").strip()
        if not produit:
            continue

        qte_raw = item.get("qte")
        if qte_raw is None:
            logger.warning(f"Quantité null pour '{produit}', ignoré.")
            continue
        try:
            qte = int(str(qte_raw).replace(",", ".").split(".")[0])
        except (ValueError, TypeError):
            logger.warning(f"Quantité illisible '{qte_raw}' pour '{produit}', ignoré.")
            continue

        inv_id = item.get("id")
        try:
            inv_id = int(inv_id) if inv_id is not None else None
        except (ValueError, TypeError):
            inv_id = None

        results.append({
            "id_inventaire": inv_id,
            "produit_mere":  produit,
            "designation":   str(item.get("designation") or "").strip(),
            "qte_physique":  qte,
        })

    return results


def _http_post(url: str, headers: dict, payload: dict, timeout: int = 60) -> dict:
    """POST JSON via urllib (stdlib pure — aucune dépendance externe)."""
    data = json.dumps(payload).encode("utf-8")
    req  = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code} — {body}") from e


# ─── Backend Mistral Pixtral (HTTP pur) ──────────────────────

def _ocr_with_mistral(img_bytes: bytes, media_type: str = "image/png") -> list:
    """
    OCR via Mistral Pixtral (pixtral-12b-2409) — appel HTTP direct, sans SDK.
    Clé API : variable d'environnement MISTRAL_API_KEY dans le .env
    Gratuit  : https://console.mistral.ai
    """
    api_key = os.environ.get("MISTRAL_API_KEY", "").strip()
    if not api_key:
        raise EnvironmentError("MISTRAL_API_KEY absente du .env")

    img_b64  = base64.standard_b64encode(img_bytes).decode("utf-8")
    data_url = f"data:{media_type};base64,{img_b64}"

    payload = {
        "model": "pixtral-12b-2409",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": data_url}},
                {"type": "text",      "text": VISION_PROMPT},
            ],
        }],
    }
    headers = {
        "Content-Type":  "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    resp    = _http_post("https://api.mistral.ai/v1/chat/completions", headers, payload)
    raw     = resp["choices"][0]["message"]["content"].strip()
    results = _parse_vision_json(raw)
    logger.info(f"Mistral Pixtral — {len(results)} ligne(s) extraite(s).")
    return results


# ─── Backend Claude Vision (HTTP pur) ────────────────────────

def _ocr_with_claude(img_bytes: bytes, media_type: str = "image/png") -> list:
    """
    OCR via Claude Vision (claude-sonnet-4-20250514) — appel HTTP direct, sans SDK.
    Clé API : variable d'environnement ANTHROPIC_API_KEY dans le .env
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise EnvironmentError("ANTHROPIC_API_KEY absente du .env")

    img_b64 = base64.standard_b64encode(img_bytes).decode("utf-8")
    payload = {
        "model":      "claude-sonnet-4-20250514",
        "max_tokens": 1000,
        "messages": [{
            "role": "user",
            "content": [
                {
                    "type":   "image",
                    "source": {
                        "type":       "base64",
                        "media_type": media_type,
                        "data":       img_b64,
                    },
                },
                {"type": "text", "text": VISION_PROMPT},
            ],
        }],
    }
    headers = {
        "Content-Type":      "application/json",
        "x-api-key":         api_key,
        "anthropic-version": "2023-06-01",
    }

    resp    = _http_post("https://api.anthropic.com/v1/messages", headers, payload)
    raw     = resp["content"][0]["text"].strip()
    results = _parse_vision_json(raw)
    logger.info(f"Claude Vision — {len(results)} ligne(s) extraite(s).")
    return results


# ─── Routeur Vision : Mistral → Claude ──────────────────────

def _ocr_page_vision(img_bytes: bytes, media_type: str = "image/png") -> list:
    """
    Essaie Mistral Pixtral en premier, bascule sur Claude Vision si indisponible.
    Les deux backends utilisent HTTP pur — aucun SDK requis.
    """
    if os.environ.get("MISTRAL_API_KEY", "").strip():
        try:
            return _ocr_with_mistral(img_bytes, media_type)
        except Exception as e:
            logger.warning(f"Mistral indisponible ({e}) — bascule sur Claude Vision.")
    else:
        logger.info("MISTRAL_API_KEY absente — bascule directe sur Claude Vision.")

    if os.environ.get("ANTHROPIC_API_KEY", "").strip():
        try:
            return _ocr_with_claude(img_bytes, media_type)
        except Exception as e:
            logger.error(f"Claude Vision indisponible : {e}")
            raise

    raise EnvironmentError(
        "Aucun backend Vision disponible. "
        "Ajoute MISTRAL_API_KEY (gratuit : console.mistral.ai) "
        "ou ANTHROPIC_API_KEY dans ton .env."
    )


# ─── Catalogue produits : Product + ProduitDv ────────────────

def _get_all_product_names() -> dict:
    """
    Construit un dictionnaire de recherche qui couvre :
      - les Product parents      → clé = product.name.lower()
      - les ProduitDv dérivés    → clé = produitdv.designation.lower()

    Chaque valeur est un dict :
      {
        "type":       "product" | "produitdv",
        "instance":   <Product> | <ProduitDv>,
        "product":    <Product parent>,   # toujours renseigné
      }

    Cela permet à _fuzzy_match_product de retrouver aussi bien "Banane"
    (produit parent) que "Ranjaly" ou "Cavendish" (sous-produits ProduitDv).
    """
    from apps.catalogue.models import Product, ProduitDv

    mapping = {}

    # ── Produits parents ──────────────────────────────────────
    for product in Product.objects.filter(is_active=True):
        key = product.name.strip().lower()
        mapping[key] = {
            "type":     "product",
            "instance": product,
            "product":  product,
        }

    # ── Sous-produits ProduitDv ───────────────────────────────
    for dv in ProduitDv.objects.select_related("product").all():
        key = dv.designation.strip().lower()
        if key:
            mapping[key] = {
                "type":     "produitdv",
                "instance": dv,
                "product":  dv.product,
            }

    logger.info(
        f"Catalogue chargé : {len(mapping)} entrée(s) "
        f"(produits + sous-produits)."
    )
    return mapping


# ─── Correspondance floue ─────────────────────────────────────

def _fuzzy_match_product(nom_ocr: str, product_names: dict) -> dict | None:
    """
    Cherche nom_ocr dans le catalogue (produits parents + ProduitDv).

    Retourne le dict {"type", "instance", "product"} ou None si rien trouvé.

    Ordre de priorité :
      1. Correspondance exacte
      2. Correspondance floue (difflib, seuil FUZZY_MATCH_CUTOFF)
      3. Inclusion partielle (ex: "Banan" → "Banane")
    """
    if not nom_ocr or not product_names:
        return None

    nom_lower  = nom_ocr.strip().lower()
    candidates = list(product_names.keys())

    # 1. Exact
    if nom_lower in product_names:
        logger.info(f"Correspondance exacte : '{nom_ocr}'")
        return product_names[nom_lower]

    # 2. Flou
    matches = get_close_matches(nom_lower, candidates, n=1, cutoff=FUZZY_MATCH_CUTOFF)
    if matches:
        best = matches[0]
        logger.info(f"Correspondance floue : '{nom_ocr}' → '{best}'")
        return product_names[best]

    # 3. Inclusion partielle
    for candidate in candidates:
        if (nom_lower in candidate or candidate in nom_lower) and len(nom_lower) >= 4:
            logger.info(f"Correspondance partielle : '{nom_ocr}' → '{candidate}'")
            return product_names[candidate]

    logger.warning(f"Aucune correspondance pour '{nom_ocr}'.")
    return None


# ─── UPSERT Inventaire ────────────────────────────────────────

def _find_or_create_inventaire_line(historique, match: dict, qte_physique: int):
    """
    UPSERT dans la table Inventaire selon le type de match :

    - match["type"] == "product"   → inventaire lié au Product parent directement
    - match["type"] == "produitdv" → inventaire lié au ProduitDv (sous-produit)

    La table Inventaire doit avoir soit un champ FK vers Product,
    soit un champ FK vers ProduitDv — adapte les filter() si besoin.

    Retourne ("updated"|"created", instance_Inventaire).
    """
    from apps.stock.models import Inventaire

    if match["type"] == "produitdv":
        dv      = match["instance"]

        existing = Inventaire.objects.filter(
            historique=historique,
            produit=dv,
        ).first()

        if existing:
            existing.quantite_phy = qte_physique
            existing.save(update_fields=["quantite_phy"])
            return "updated", existing

        inv = Inventaire.objects.create(
            historique=historique,
            produit=dv,
            quantite_theo=int(dv.nombre or 0),
            quantite_phy=qte_physique,
        )
        return "created", inv

    else:  # "product" — cherche ou crée un ProduitDv par défaut pour ce Product
        product = match["instance"]
        from apps.catalogue.models import ProduitDv

        # Chercher un ProduitDv pour ce Product (par défaut: le premier)
        dv = ProduitDv.objects.filter(product=product).first()
        
        if dv:
            # Si on trouve un ProduitDv, utiliser la logique ProduitDv
            existing = Inventaire.objects.filter(
                historique=historique,
                produit=dv,
            ).first()

            if existing:
                existing.quantite_phy = qte_physique
                existing.save(update_fields=["quantite_phy"])
                return "updated", existing

            inv = Inventaire.objects.create(
                historique=historique,
                produit=dv,
                quantite_theo=int(dv.nombre or 0),
                quantite_phy=qte_physique,
            )
            return "created", inv
        else:
            # Pas de ProduitDv pour ce Product → on ne peut pas créer d'Inventaire
            logger.warning(f"Pas de ProduitDv trouvé pour Product={product.name}")
            return None, None


# ─── Traitement PDF ───────────────────────────────────────────

def process_pdf(pdf_input):
    """
    Lit un PDF d'inventaire et extrait les quantités physiques.

    Stratégie :
      1. Extraction texte directe (PDF numérique) — sans API, instantané
      2. Vision IA (scan / manuscrit) — Mistral Pixtral, fallback Claude
    """
    try:
        import fitz
        from io import BytesIO
        from django.core.files.uploadedfile import InMemoryUploadedFile

        if isinstance(pdf_input, str):
            with open(pdf_input, "rb") as f:
                pdf_bytes = f.read()
        elif isinstance(pdf_input, InMemoryUploadedFile):
            pdf_bytes = pdf_input.read()
        else:
            pdf_bytes = pdf_input.read()

        doc     = fitz.open(stream=BytesIO(pdf_bytes), filetype="pdf")
        results = []

        # ── 1. Extraction texte (PDF numérique) ───────────────────────────
        all_words = []
        for page in doc:
            all_words.extend(page.get_text("words"))

        if all_words:
            rows_by_y = {}
            for w in all_words:
                x0, y0, x1, y1, word = w[0], w[1], w[2], w[3], w[4]
                y_key = round(y0 / 5) * 5
                rows_by_y.setdefault(y_key, []).append((x0, word))

            for y_key in sorted(rows_by_y.keys()):
                cells = [w for _, w in sorted(rows_by_y[y_key], key=lambda x: x[0])]
                if cells and cells[0].strip().lower() in HEADER_WORDS:
                    continue

                # Format complet : [ID, Produit, Désignation, Théo, Phy, Écart]
                if len(cells) >= 5 and cells[0].isdigit():
                    try:
                        inv_id = int(cells[0])
                        last3  = cells[-3:]
                        if all(
                            re.match(r"^-?\d+$", c.replace(",", ".").split(".")[0])
                            for c in last3
                        ):
                            middle = cells[1:-3]
                            results.append({
                                "id_inventaire": inv_id,
                                "produit_mere":  middle[0] if middle else "",
                                "designation":   " ".join(middle[1:]) if len(middle) > 1 else "",
                                "qte_physique":  int(re.sub(r"[^0-9]", "", last3[1]) or "0"),
                            })
                    except (ValueError, IndexError):
                        pass
                elif len(cells) >= 2:
                    produit = cells[0].strip()
                    qte_raw = _clean_quantity(cells[-1].strip())
                    if produit and qte_raw:
                        results.append({
                            "id_inventaire": None,
                            "produit_mere":  produit,
                            "designation":   "",
                            "qte_physique":  int(qte_raw),
                        })

        if results:
            doc.close()
            logger.info(f"Extraction texte directe : {len(results)} ligne(s).")
            return results

        # ── 2. Vision IA (scan / manuscrit) ──────────────────────────────
        logger.info("Pas de texte extractible — démarrage Vision IA (Mistral → Claude)...")

        for page_num in range(doc.page_count):
            page      = doc.load_page(page_num)
            pix       = page.get_pixmap(dpi=300)
            img_bytes = pix.tobytes("png")

            try:
                page_results = _ocr_page_vision(img_bytes, media_type="image/png")
                results.extend(page_results)
                logger.info(f"Page {page_num + 1} — {len(page_results)} ligne(s).")
            except Exception as e:
                logger.error(f"Page {page_num + 1} — Vision IA échouée : {e}")

        doc.close()
        return results

    except ImportError as e:
        logger.error(f"Dépendance manquante : {e}")
        return []
    except Exception as e:
        logger.error(f"Erreur process_pdf : {e}", exc_info=True)
        return []


# ─── Utilitaires ─────────────────────────────────────────────

def _clean_quantity(text: str):
    cleaned = re.sub(r"[^0-9]", "", text)
    return cleaned if cleaned else None


def _cleanup(file_path: str):
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        logger.warning(f"Impossible de supprimer {file_path} : {e}")


# ─── Traitement principal ─────────────────────────────────────

def process_pdf_async(file_path, historique_id, user_id):
    """
    Orchestration complète :
      1. process_pdf  → extraction texte direct ou Vision IA
      2. Fuzzy match  → Product parent OU ProduitDv (sous-produit)
      3. UPSERT       → Inventaire
      4. Notification → utilisateur
    """
    try:
        from apps.stock.models import HistoriqueInventaire

        results = process_pdf(file_path)

        if not results:
            _cleanup(file_path)
            return {
                "detected": 0,
                "updated":  0,
                "created":  0,
                "message":  "Aucune donnée détectée dans le PDF.",
            }

        try:
            historique = HistoriqueInventaire.objects.get(id=historique_id)
        except HistoriqueInventaire.DoesNotExist:
            _cleanup(file_path)
            return {
                "detected": len(results),
                "updated":  0,
                "created":  0,
                "message":  f"Historique ID={historique_id} introuvable.",
            }

        # Catalogue complet : produits parents + sous-produits ProduitDv
        product_names = _get_all_product_names()

        updated   = 0
        created   = 0
        not_found = []

        for item in results:
            nom_ocr      = item.get("produit_mere", "").strip()
            qte_physique = item["qte_physique"]

            # ── Correspondance floue (Product ou ProduitDv) ───────────────
            match = _fuzzy_match_product(nom_ocr, product_names)

            # Fallback par ID Inventaire (PDF numérique généré)
            if not match and item.get("id_inventaire"):
                from apps.stock.models import Inventaire
                inv = Inventaire.objects.filter(
                    id=item["id_inventaire"],
                    historique_id=historique_id,
                ).first()
                if inv:
                    inv.quantite_phy = qte_physique
                    inv.save(update_fields=["quantite_phy"])
                    updated += 1
                    logger.info(f"MAJ par ID : inv={inv.id} phy={qte_physique}")
                    continue

            if match:
                type_str = match["type"]        # "product" ou "produitdv"
                nom_match = (
                    match["instance"].designation
                    if type_str == "produitdv"
                    else match["instance"].name
                )
                try:
                    action, inv = _find_or_create_inventaire_line(
                        historique, match, qte_physique
                    )
                    if action is None:
                        # Cas où Product n'a pas de ProduitDv
                        not_found.append(f"{nom_ocr} (pas de variante)")
                        logger.warning(f"Pas de ProduitDv pour Product '{nom_match}'")
                    elif action == "updated":
                        updated += 1
                        logger.info(
                            f"UPDATED [{type_str}] "
                            f"OCR='{nom_ocr}' → '{nom_match}' "
                            f"| inv={inv.id} phy={qte_physique}"
                        )
                    else:  # "created"
                        created += 1
                        logger.info(
                            f"CREATED [{type_str}] "
                            f"OCR='{nom_ocr}' → '{nom_match}' "
                            f"| inv={inv.id} phy={qte_physique}"
                        )
                except Exception as e:
                    logger.error(
                        f"Erreur UPSERT pour '{nom_ocr}' → '{nom_match}' : {e}",
                        exc_info=True,
                    )
                    not_found.append(f"{nom_ocr} (erreur UPSERT)")
            else:
                not_found.append(nom_ocr)
                logger.warning(f"Introuvable après fuzzy : '{nom_ocr}'")

        # ── Notification ──────────────────────────────────────────────────
        try:
            from apps.notifications.models import Notification
            from django.contrib.auth import get_user_model
            user = get_user_model().objects.get(id=user_id)
            Notification.creer(
                utilisateur=user,
                titre="Analyse PDF terminée",
                data={
                    "model_name": "Inventaire",
                    "objet_nom":  f"{updated + created}/{len(results)} produits traités",
                    "notif":      "terminée",
                },
                priorite=1,
            )
        except Exception as e:
            logger.error(f"Erreur notification : {e}")

        _cleanup(file_path)

        total_ok = updated + created
        return {
            "detected":  len(results),
            "updated":   updated,
            "created":   created,
            "not_found": not_found,
            "sample":    results[:5],
            "message": (
                f"{total_ok}/{len(results)} produits traités "
                f"({updated} mis à jour, {created} créés"
                + (
                    f", {len(not_found)} introuvable(s) : {', '.join(not_found)}"
                    if not_found else ""
                )
                + ")."
            ),
        }

    except Exception as e:
        _cleanup(file_path)
        logger.error(f"process_pdf_async erreur : {e}", exc_info=True)
        try:
            from apps.notifications.models import Notification
            from django.contrib.auth import get_user_model
            user = get_user_model().objects.get(id=user_id)
            Notification.creer(
                utilisateur=user,
                titre="Erreur Analyse PDF",
                data={
                    "model_name": "Inventaire",
                    "objet_nom":  "Le fichier PDF",
                    "notif":      f"erreur : {str(e)}",
                },
                priorite=2,
            )
        except Exception:
            pass
        return {
            "detected": 0,
            "updated":  0,
            "created":  0,
            "message":  f"Erreur : {str(e)}",
        }
    finally:
        try:
            from django.db import connection
            connection.close()
        except Exception:
            pass