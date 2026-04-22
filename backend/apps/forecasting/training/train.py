# apps/forecasting/training/train.py
import json, os, sys
import torch
from transformers import (
    T5ForConditionalGeneration,
    T5Tokenizer,
    Trainer,
    TrainingArguments
)
from datasets import Dataset

# ── Chemins ────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
DATASET     = os.path.join(BASE_DIR, "dataset.json")
OUTPUT_DIR  = os.path.join(BASE_DIR, "..", "sql_model_weights")

# ── Schéma ─────────────────────────────────────────────────────
SCHEMA = """
Tables:
- catalogue_products(id, nom, categorie_id, prix, fournisseur_id)
- stock_inventaire(id, produit_id, quantite, seuil_critique, seuil_bas)
- stock_mouvements(id, produit_id, type, quantite, date)
- commandes_donnee_vente(id, produit_id, quantite, date, prix_unitaire)
- forecasting_predictions(id, produit_id, valeur, date_prevision, modele)
- notifications_alertes(id, produit_id, type, message, date, lu)
"""

# ── Dataset ────────────────────────────────────────────────────
with open(DATASET, encoding="utf-8") as f:
    raw = json.load(f)

data = {
    "input":  [f"Schema: {SCHEMA} Question: {d['question']}" for d in raw],
    "target": [d["sql"] for d in raw],
}
dataset = Dataset.from_dict(data).train_test_split(test_size=0.1)

# ── Modèle ─────────────────────────────────────────────────────
MODEL_NAME = "t5-small"
tokenizer  = T5Tokenizer.from_pretrained(MODEL_NAME)
model      = T5ForConditionalGeneration.from_pretrained(MODEL_NAME)

def tokenize(batch):
    inp = tokenizer(batch["input"],  max_length=512, truncation=True, padding="max_length")
    tgt = tokenizer(batch["target"], max_length=256, truncation=True, padding="max_length")
    inp["labels"] = tgt["input_ids"]
    return inp

tokenized = dataset.map(tokenize, batched=True)

# ── Entraînement ───────────────────────────────────────────────
args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=20,             
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    warmup_steps=50,
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    logging_dir=os.path.join(BASE_DIR, "logs"),
)

Trainer(
    model=model,
    args=args,
    train_dataset=tokenized["train"],
    eval_dataset=tokenized["test"],
).train()

model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"✅ Modèle sauvegardé dans {OUTPUT_DIR}")