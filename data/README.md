# Synthetic bug dataset for Beca

This directory contains a generated synthetic bug dataset for AI training, evaluation, and bug triage experiments.

## Files

- `generate_bug_dataset_1000.py` — creates a 1,000-row synthetic dataset in JSONL format.
- `bug_dataset_1000_synthetic.jsonl` — generated output file.

## Schema

Each JSON line contains:

- `bug_id`
- `bug_title`
- `bug_description`
- `steps_to_reproduce`
- `expected_behavior`
- `actual_behavior`
- `ground_truth_label` in {`UI`, `API`, `LOGIC`}
- `severity` in {`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`}
- `metadata`: `split`, `source`, `language`, `domain`

## Generate the dataset

```bash
cd data
python generate_bug_dataset_1000.py
```

## Distribution

The generator follows a practical distribution for this repo:

- UI: 45%
- LOGIC: 35%
- API: 20%
- train: 700
- val: 150
- test: 150

This keeps the dataset compatible with the existing `ai-ml-service` pipeline, which expects JSONL bug records and a `ground_truth_label` target.
