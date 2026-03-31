import csv
import traceback
import pandas as pd
from django.apps import apps
from django.db import transaction
from django.db.models import ForeignKey
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import DataImport, ExecutionPipeline
from .model_mapping import MODEL_MAPPING
from .schemas import PYDANTIC_MODELS


# ─── ETLRunner (version principale) ─────────────────────────
class ETLRunner:
    def __init__(self, data_id: str = None, update=None):
        self.data_id = data_id
        self.update = update

    def extract(self, file_path, file_type):
        if file_type == 'csv':
            with open(file_path, "rb") as f:
                data_str = f.read().decode("utf-8", errors="replace")
            sample = data_str[:1024]
            dialect = csv.Sniffer().sniff(sample)
            sep = dialect.delimiter
            df = pd.read_csv(file_path, sep=sep)
        elif file_type in ['xlsx', 'xls']:
            df = pd.read_excel(file_path)
        elif file_type == 'json':
            df = pd.read_json(file_path)
        elif file_type == 'parquet':
            df = pd.read_parquet(file_path)
        else:
            raise ValueError("Format de fichier non supporté")
        return df

    def transform(self, df):
        df.columns = df.columns.str.strip().str.lower()
        df = df.drop_duplicates()
        return df

    @staticmethod
    def resolve_fks_grouped(row: dict, fk_models: dict, field_mapping: dict):
        grouped = {}
        resolved_fk = {}
        normal_fields = {}

        for col, value in row.items():
            if "__" in col:
                table_name, field_name = col.split("__", 1)
                grouped.setdefault(table_name, {})[field_name] = value
            else:
                normal_fields[col] = value

        for alias, model_path in fk_models.items():
            if alias not in grouped:
                continue
            app_label, model_name = model_path.split(".")
            ModelClass = apps.get_model(app_label, model_name)
            values = grouped[alias] or {}
            clean_values = {k: v for k, v in values.items() if v not in [None, ""]}

            if not clean_values:
                obj = None
            else:
                obj, _ = ModelClass.objects.get_or_create(**clean_values)

            for field, fk_alias in field_mapping.items():
                if fk_alias == alias:
                    resolved_fk[field] = obj

        return resolved_fk, normal_fields

    def load(self, df, django_model, modele_name):
        pydantic_model = PYDANTIC_MODELS[modele_name]
        fk_models = getattr(pydantic_model.Config, "fk_apps", {}) or {}
        field_mapping = getattr(pydantic_model.Config, "field_mapping", {}) or {}

        total = success = fail = 0

        for _, row in df.iterrows():
            total += 1
            try:
                with transaction.atomic():
                    row_dict = row.to_dict()
                    validated = pydantic_model(**row_dict).dict()
                    resolved_fk, normal_fields = self.resolve_fks_grouped(
                        validated, fk_models, field_mapping
                    )
                    final_data = {**resolved_fk, **normal_fields}
                    final_data = {k: v for k, v in final_data.items() if v is not None}

                    if self.update:
                        unique_fields = [f.name for f in django_model._meta.fields if f.unique]
                        kwargs = {k: final_data[k] for k in unique_fields if k in final_data}
                        defaults = {k: v for k, v in final_data.items() if k not in kwargs}
                        if kwargs:
                            django_model.objects.update_or_create(defaults=defaults, **kwargs)
                        else:
                            django_model.objects.create(**final_data)
                    else:
                        django_model.objects.create(**final_data)

                success += 1
            except Exception as e:
                fail += 1
                print(f"Erreur à la ligne {total}: {str(e)}")
                continue

        return total, success, fail

    def run(self):
        if not self.data_id:
            raise ValidationError("Le paramètre 'data_id' est requis.")

        file_object = get_object_or_404(DataImport, id=self.data_id)
        self.update = file_object.update_table if self.update is None else self.update

        if file_object.status == "DONE":
            return {"status": "success", "data": None, "message": "Ce fichier a déjà été importé."}

        django_model = MODEL_MAPPING.get(file_object.target_table)
        if not django_model:
            raise Exception(f"Modèle inconnu : {file_object.target_table}")

        pipeline = ExecutionPipeline.objects.create(
            name=file_object,
            description=f"Pipeline pour le fichier {file_object.name}",
            status="RUNNING",
            commence_le=timezone.now()
        )

        try:
            df = self.extract(file_object.file_uploaded.path, file_object.file_type)
            df_transformed = self.transform(df)
            total, success, fail = self.load(df_transformed, django_model, file_object.target_table)

            file_object.status = "DONE"
            file_object.save(update_fields=["status"])

            pipeline.status = "DONE" if fail == 0 else "ERR"
            pipeline.enregistrement_traite = total
            pipeline.enregistrement_reussi = success
            pipeline.enregistrement_echoue = fail
            pipeline.complete_le = timezone.now()
            pipeline.save()

            return {
                "status": "success" if fail == 0 else "partial_success",
                "data": {"pipeline_id": pipeline.id, "total": total, "success": success, "fail": fail},
                "message": f"ETL terminé pour la table {file_object.target_table}!"
            }

        except Exception as e:
            file_object.status = "ERR"
            file_object.save(update_fields=["status"])
            pipeline.status = "ERR"
            pipeline.journal_execution = traceback.format_exc()
            pipeline.complete_le = timezone.now()
            pipeline.save()
            return {"status": "error", "message": f"Échec de l'ETL : {str(e)}"}


# ─── ETLRunner2 (version alternative) ───────────────────────
class ETLRunner2:
    def __init__(self, data_id=None, update=None):
        self.data_id = data_id
        self.update = update

    def extract(self, file_path, file_type):
        if file_type == 'csv':
            df = pd.read_csv(file_path, delimiter=",")
        elif file_type in ['xlsx', 'xls']:
            df = pd.read_excel(file_path)
        elif file_type == 'json':
            df = pd.read_json(file_path)
        elif file_type == 'parquet':
            df = pd.read_parquet(file_path)
        else:
            raise ValueError("Format de fichier non supporté")
        return df

    def transform(self, df):
        df.columns = df.columns.str.strip().str.lower()
        df = df.drop_duplicates()
        return df

    def handle_foreign_keys_generic(self, model, row):
        for field in model._meta.get_fields():
            if isinstance(field, ForeignKey):
                field_name = field.name
                related_model = field.related_model
                value = row.get(field_name)
                if value:
                    try:
                        value = int(value)
                    except (ValueError, TypeError):
                        pass
                    if isinstance(value, int):
                        obj = related_model.objects.filter(id=value).first()
                        if not obj:
                            raise ValidationError(
                                {field_name: f"Objet lié avec id {value} non trouvé dans {related_model.__name__}"}
                            )
                        row[field_name] = obj
                    else:
                        obj = get_object_or_404(related_model, name=value)
                        row[field_name] = obj
                else:
                    row[field_name] = None
        return row

    def load(self, df, modele_to_use, modele_name):
        pydantic_model = PYDANTIC_MODELS[modele_name]
        unique_fields = [
            f.name for f in modele_to_use._meta.get_fields() if getattr(f, 'unique', False)
        ]
        traite = len(df)
        reussi = echoue = 0

        for _, row in df.iterrows():
            row_data = row.to_dict()
            try:
                row_data = pydantic_model.model_validate(row_data).model_dump()
                row_data = self.handle_foreign_keys_generic(modele_to_use, row_data)
                lookup = {f: row_data[f] for f in unique_fields if f in row_data}

                if self.update and lookup:
                    modele_to_use.objects.update_or_create(defaults=row_data, **lookup)
                    reussi += 1
                else:
                    if lookup and modele_to_use.objects.filter(**lookup).exists():
                        echoue += 1
                    else:
                        modele_to_use.objects.create(**row_data)
                        reussi += 1
            except Exception as e:
                print(f"Erreur lors du traitement de la ligne {row_data}: {str(e)}")
                echoue += 1
                continue

        return traite, reussi, echoue

    def run(self):
        if not self.data_id:
            raise ValidationError("Le paramètre 'data_id' est requis.")

        file_object = get_object_or_404(DataImport, id=self.data_id)
        self.update = file_object.update_table if self.update is None else self.update

        if file_object.status == "DONE":
            return {"status": "success", "data": None, "message": "Ce fichier a déjà été importé."}

        modele_to_use = MODEL_MAPPING.get(file_object.target_table)
        if not modele_to_use:
            raise Exception(f"Modèle inconnu : {file_object.target_table}")

        pipeline = ExecutionPipeline.objects.create(
            name=file_object,
            description=f"Pipeline pour le fichier {file_object.name}",
            status="RUNNING",
            commence_le=timezone.now()
        )

        try:
            with transaction.atomic():
                df = self.extract(file_object.file_uploaded.path, file_object.file_type)
                df_transformed = self.transform(df)
                total, success, fail = self.load(
                    df_transformed, modele_to_use, file_object.target_table
                )
                file_object.status = "DONE"
                file_object.save(update_fields=["status"])

            pipeline.status = "DONE" if fail == 0 else "ERR"
            pipeline.enregistrement_traite = total
            pipeline.enregistrement_reussi = success
            pipeline.enregistrement_echoue = fail
            pipeline.complete_le = timezone.now()
            pipeline.save()

            return {
                "status": "success" if fail == 0 else "partial_success",
                "data": {"pipeline_id": pipeline.id, "total": total, "success": success, "fail": fail},
                "message": f"ETL terminé pour la table {file_object.target_table}!"
            }

        except Exception as e:
            file_object.status = "ERR"
            file_object.save(update_fields=["status"])
            pipeline.status = "ERR"
            pipeline.journal_execution = traceback.format_exc()
            pipeline.complete_le = timezone.now()
            pipeline.save()
            return {"status": "error", "message": f"Échec de l'ETL : {str(e)}"}