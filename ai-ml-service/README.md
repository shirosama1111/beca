# Trained ML inference service

This private service runs two scikit-learn models (TF-IDF bigrams + Logistic Regression): bug type (`UI`, `API`, `LOGIC`) and severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`). It trains at startup using only rows marked `metadata.split=train` from ai-beta. Validation/test records are not included in fitting.

Dataset location in the `ai-beta` branch: `test2/test2-dataset-evaluation-pipeline/test2/data/bug_dataset.jsonl`. Fetch it and start the inference service:

```bash
git fetch origin ai-beta
git show origin/ai-beta:test2/test2-dataset-evaluation-pipeline/test2/data/bug_dataset.jsonl > /tmp/bug_dataset.jsonl
cd ai-ml-service
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
AI_BETA_DATASET_PATH=/tmp/bug_dataset.jsonl python app.py
```

Configure Spring Boot with `ML_MODEL_URL=http://localhost:8091/predict`. `/health` reports the dataset-derived model version. The dataset card says all 1,000 labels are synthetic and unverified; model confidence is not calibrated real-world accuracy. Validate with human-reviewed real reports before operational decisions. Keep this inference service on a private network.
