from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any
from flask import Flask, jsonify, request
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

app = Flask(__name__)
DATASET_PATH = Path(os.environ.get("AI_BETA_DATASET_PATH", "data/bug_dataset.jsonl"))
MODEL_VERSION = "unavailable"

def normalize(value: Any) -> str:
    if value is None: return ""
    if isinstance(value, (list, tuple)): return " ".join(normalize(item) for item in value)
    if isinstance(value, dict): return " ".join(f"{key} {normalize(item)}" for key, item in sorted(value.items()))
    return " ".join(str(value).split())

def build_text(record: dict[str, Any]) -> str:
    return normalize(" ".join((normalize(record.get("bug_description")), normalize(record.get("steps_to_reproduce")), normalize(record.get("console_logs")), normalize(record.get("error_context")))))

def train_models():
    if not DATASET_PATH.is_file(): raise RuntimeError(f"Dataset missing: {DATASET_PATH}. Set AI_BETA_DATASET_PATH to the ai-beta JSONL file.")
    raw = DATASET_PATH.read_bytes()
    global MODEL_VERSION
    MODEL_VERSION = "ai-beta-tfidf-logreg-" + hashlib.sha256(raw).hexdigest()[:12]
    records = [json.loads(line) for line in raw.decode("utf-8-sig").splitlines() if line.strip()]
    train = [row for row in records if str(row.get("metadata", {}).get("split", "train")).lower() == "train"]
    if not train: raise RuntimeError("Dataset train split is empty")
    texts = [build_text(row) for row in train]
    def fit(target):
        labels = [str(row[target]).upper() for row in train if row.get(target)]
        features = [text for row, text in zip(train, texts) if row.get(target)]
        if len(set(labels)) < 2: raise RuntimeError(f"Not enough labels for {target}")
        model = Pipeline([("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_df=0.95)), ("classifier", LogisticRegression(max_iter=2000, class_weight="balanced"))])
        model.fit(features, labels)
        return model
    return fit("ground_truth_label"), fit("severity")

TYPE_MODEL, SEVERITY_MODEL = train_models()

@app.get("/health")
def health():
    return jsonify({"status": "ready", "model_version": MODEL_VERSION, "type_labels": list(TYPE_MODEL.classes_), "severity_labels": list(SEVERITY_MODEL.classes_)})

@app.post("/predict")
def predict():
    record = request.get_json(silent=True)
    if not isinstance(record, dict): return jsonify({"error": "Expected JSON object"}), 400
    text = build_text(record)
    if not text: return jsonify({"error": "Report text is empty"}), 400
    type_prob = TYPE_MODEL.predict_proba([text])[0]
    severity_prob = SEVERITY_MODEL.predict_proba([text])[0]
    ti, si = int(type_prob.argmax()), int(severity_prob.argmax())
    return jsonify({"ground_truth_label": str(TYPE_MODEL.classes_[ti]), "severity": str(SEVERITY_MODEL.classes_[si]), "confidence": float(type_prob[ti]), "severity_confidence": float(severity_prob[si]), "model_version": MODEL_VERSION})

if __name__ == "__main__": app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8091")))
