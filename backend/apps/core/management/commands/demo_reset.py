"""
Sauvegarde et restauration de la base SQLite, pour refaire une démonstration (capture vidéo,
recette…) depuis exactement le même point de départ.

    python manage.py demo_reset sauvegarder [nom]   # photographie la base actuelle
    python manage.py demo_reset restaurer   [nom]   # remet la base dans l'état sauvegardé
    python manage.py demo_reset lister              # sauvegardes disponibles

Bonnes pratiques :
  • sauvegardez AVANT d'insérer vos données de démonstration ;
  • arrêtez le serveur avant de restaurer (la restauration échoue proprement s'il tient la base) ;
  • une restauration sauvegarde d'abord l'état courant (« avant-restauration-<date> ») : rien
    n'est perdu, même en cas d'erreur de manipulation ;
  • seule la base est concernée : les fichiers téléversés (media, pdf_uploads) ne le sont pas.

Les sauvegardes sont rangées dans backend/sauvegardes/ (ignoré par git : *.sqlite3*).
"""
import re
import sqlite3
import time
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

NOM_VALIDE = re.compile(r"^[A-Za-z0-9_.-]+$")
EXTENSION = ".sqlite3"
ATTENTE_MAX = 10  # secondes d'attente d'une base verrouillée avant d'abandonner


def _ouvrir_lecture(chemin):
    return sqlite3.connect(Path(chemin).resolve().as_uri() + "?mode=ro", uri=True)


def copier_base(source, destination):
    """
    Copie cohérente d'une base SQLite (API de sauvegarde SQLite : sûre même si la base est ouverte).
    Si une base reste verrouillée plus de ATTENTE_MAX secondes, abandonne (sqlite3.OperationalError)
    au lieu de réessayer indéfiniment comme le fait `Connection.backup` par défaut.
    """
    limite = time.monotonic() + ATTENTE_MAX

    def surveiller(statut, restant, total):
        if statut in (sqlite3.SQLITE_BUSY, sqlite3.SQLITE_LOCKED) and time.monotonic() > limite:
            raise sqlite3.OperationalError("database is locked")

    src = _ouvrir_lecture(source)
    try:
        dst = sqlite3.connect(str(destination), timeout=5)
        try:
            src.backup(dst, pages=200, progress=surveiller)
        finally:
            dst.close()
    finally:
        src.close()


def base_saine(chemin):
    """True si le contrôle d'intégrité SQLite répond « ok » ; False si le fichier n'est pas une base valide."""
    con = _ouvrir_lecture(chemin)
    try:
        return con.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    except sqlite3.OperationalError:
        raise  # base verrouillée ou inaccessible : ce n'est pas de la corruption
    except sqlite3.DatabaseError:
        return False  # « file is not a database »
    finally:
        con.close()


def _taille(chemin):
    return f"{Path(chemin).stat().st_size / 1024:,.0f} Ko".replace(",", " ")


class Command(BaseCommand):
    help = "Sauvegarde / restaure la base SQLite pour refaire une démonstration depuis le même point de départ."

    def add_arguments(self, parser):
        parser.add_argument("action", choices=["sauvegarder", "restaurer", "lister"])
        parser.add_argument("nom", nargs="?", default="demo", help="Nom de la sauvegarde (défaut : demo)")
        parser.add_argument("--ecraser", action="store_true",
                            help="Autorise à remplacer une sauvegarde existante (sinon refusé)")
        parser.add_argument("--noinput", action="store_true", help="Ne pas demander de confirmation")
        parser.add_argument("--base", help="Chemin de la base (défaut : celle de la configuration Django)")
        parser.add_argument("--dossier", help="Dossier des sauvegardes (défaut : backend/sauvegardes)")

    # ── résolution des chemins ─────────────────────────────────────────────────────────────
    def _base(self, options):
        if options["base"]:
            return Path(options["base"])
        config = settings.DATABASES["default"]
        nom = str(config["NAME"])
        if not config["ENGINE"].endswith("sqlite3") or nom == ":memory:" or nom.startswith("file:"):
            raise CommandError("Cette commande ne gère qu'une base SQLite stockée dans un fichier.")
        return Path(nom)

    def _dossier(self, options):
        return Path(options["dossier"]) if options["dossier"] else Path(settings.BASE_DIR) / "sauvegardes"

    def _chemin(self, dossier, nom):
        if not NOM_VALIDE.match(nom):
            raise CommandError("Nom invalide : lettres, chiffres, « _ », « - » et « . » uniquement.")
        return dossier / f"{nom}{EXTENSION}"

    # ── actions ────────────────────────────────────────────────────────────────────────────
    def handle(self, *args, **options):
        dossier = self._dossier(options)
        if options["action"] == "lister":
            return self._lister(dossier)
        base = self._base(options)
        if not base.is_file():
            raise CommandError(f"Base introuvable : {base}")
        chemin = self._chemin(dossier, options["nom"])
        if options["action"] == "sauvegarder":
            self._sauvegarder(base, chemin, options["ecraser"])
        else:
            self._restaurer(base, chemin, dossier, options["noinput"])

    def _lister(self, dossier):
        fichiers = sorted(dossier.glob(f"*{EXTENSION}"), key=lambda f: f.stat().st_mtime, reverse=True) \
            if dossier.is_dir() else []
        if not fichiers:
            self.stdout.write(f"Aucune sauvegarde dans {dossier}")
            return
        for f in fichiers:
            date = datetime.fromtimestamp(f.stat().st_mtime).strftime("%d/%m/%Y %H:%M")
            self.stdout.write(f"{f.stem:<40} {date}  {_taille(f):>10}")

    def _sauvegarder(self, base, chemin, ecraser):
        if chemin.exists() and not ecraser:
            raise CommandError(
                f"La sauvegarde « {chemin.stem} » existe déjà. La remplacer ferait perdre le point de départ "
                "d'origine : choisissez un autre nom, ou ajoutez --ecraser si c'est voulu."
            )
        chemin.parent.mkdir(parents=True, exist_ok=True)
        copier_base(base, chemin)
        if not base_saine(chemin):
            chemin.unlink()
            raise CommandError("La copie a échoué au contrôle d'intégrité ; elle a été supprimée.")
        self.stdout.write(self.style.SUCCESS(f"Sauvegarde « {chemin.stem} » créée ({_taille(chemin)}) : {chemin}"))

    def _restaurer(self, base, chemin, dossier, sans_confirmation):
        if not chemin.is_file():
            raise CommandError(f"Sauvegarde « {chemin.stem} » introuvable dans {dossier}. "
                               "Voir : python manage.py demo_reset lister")
        if not base_saine(chemin):
            raise CommandError("La sauvegarde est corrompue (contrôle d'intégrité) : restauration annulée.")
        if not sans_confirmation:
            reponse = input(f"Remplacer la base actuelle par « {chemin.stem} » ? "
                            "L'état courant sera d'abord sauvegardé. (oui/non) ")
            if reponse.strip().lower() not in ("oui", "o", "yes", "y"):
                raise CommandError("Restauration annulée.")
        filet = dossier / f"avant-restauration-{datetime.now():%Y%m%d-%H%M%S}{EXTENSION}"
        dossier.mkdir(parents=True, exist_ok=True)
        try:
            copier_base(base, filet)
            copier_base(chemin, base)
        except sqlite3.OperationalError as e:
            raise CommandError(
                f"La base est verrouillée ou inaccessible ({e}). Arrêtez le serveur Django puis "
                "recommencez : la base n'a pas été modifiée."
            )
        if not base_saine(base):
            raise CommandError(f"La base restaurée échoue au contrôle d'intégrité. État précédent : {filet}")
        self.stdout.write(self.style.SUCCESS(
            f"Base restaurée depuis « {chemin.stem} ». État précédent conservé : {filet.name}"
        ))
        self.stdout.write("Rappel : les fichiers téléversés (media, pdf_uploads) ne sont pas concernés.")
