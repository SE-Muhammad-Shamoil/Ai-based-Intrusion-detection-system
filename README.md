# NetSentinel: UNSW-NB15 Intrusion Detection Live Demo

NetSentinel is a web application demonstrating machine-learning-based network intrusion detection trained on the original **UNSW-NB15** dataset. It provides real-time dual-model threat detection, interactive feature distributions, and **TreeSHAP** explainability with AI analyst notes.

---

## 🛡️ Key Features

- **Dual-Model Inference Engine**:
  - **Random Forest (Binary)**: Classifies flows as **Normal** vs **Attack** and outputs an attack probability per flow with a client-tunable decision threshold.
  - **XGBoost (Multiclass)**: Categorizes intrusions across 10 classes (`Normal` + 9 attack types: `Generic`, `Exploits`, `Fuzzers`, `DoS`, `Reconnaissance`, `Analysis`, `Backdoor`, `Shellcode`, `Worms`).
- **TreeSHAP Explainability**: Computes log-odds margin feature contributions for the predicted class using XGBoost's built-in TreeSHAP algorithm (`pred_contribs=True`), highlighting the top 8 influential features for any inspected flow.
- **Explain with AI**: Synthesizes model evidence into a 4-part analyst note (`What was flagged`, `Why the model thinks so`, `How sure it is`, `What to check next`). Uses Anthropic Claude when configured, with automatic fallback to a deterministic analyst template if no API key is provided.
- **Glassmorphism Design System**: Clean, light-theme interface with ambient background glow, accessible WCAG AA contrast, responsive layout down to 360px, and zero third-party UI bloat.

> [!IMPORTANT]
> **Dataset Replay Constraint**: NetSentinel is a replay demonstration for preprocessed flow data, not a live packet sniffer. Uploaded files must match the 42-feature UNSW-NB15 schema produced by Argus and Bro-IDS. Arbitrary raw PCAP captures cannot be processed without prior feature extraction.

---

## 📁 Repository Layout

```
Ai-based-Intrusion-detection-system/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application, lifespan & endpoints
│   │   ├── config.py            # Environment configuration & limits
│   │   ├── schemas.py           # Pydantic v2 schemas
│   │   ├── preprocessing.py     # Schema validation & OrdinalEncoder transformation
│   │   ├── models.py            # Artifact loader, inference & TreeSHAP
│   │   ├── explain.py           # Evidence builder & template fallback
│   │   ├── llm.py               # Anthropic provider & rate limiter
│   │   ├── sessions.py          # In-memory session store (30m TTL)
│   │   └── domain.py            # Feature & attack class plain-English descriptions
│   ├── artifacts/               # Pre-trained models, encoder, and metrics
│   │   ├── classes.json
│   │   ├── encoder.joblib
│   │   ├── feature_order.json
│   │   ├── metrics_rf.json
│   │   ├── metrics_xgb.json
│   │   ├── rf_binary.joblib
│   │   ├── sample_flows.csv
│   │   ├── versions.json
│   │   └── xgb_multiclass.json
│   ├── scripts/
│   │   └── verify_artifacts.py  # Standalone artifact verification script
│   ├── tests/
│   │   ├── test_preprocessing.py
│   │   ├── test_endpoints.py
│   │   └── test_contributions.py
│   ├── conftest.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router (layout.tsx, page.tsx, globals.css)
│   │   ├── components/          # Header, Hero, UploadZone, ResultsTable, Drawer, etc.
│   │   └── lib/                 # Typed API client, types, design tokens
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── .env.local.example
└── README.md
```

---

## ⚙️ Prerequisites

- **Python**: 3.11 or 3.12 (Python 3.12 recommended)
- **Node.js**: v18+ or v20+ / v22+ (npm or pnpm)
- Pinned library versions in `backend/artifacts/versions.json`:
  - `scikit-learn`: `1.6.1`
  - `xgboost`: `3.4.1`
  - `numpy`: `2.1.3`
  - `pandas`: `2.2.3`

---

## 🚀 Quickstart Guide

### 1. Artifact Placement
Ensure the artifact files are unpacked into `backend/artifacts/`:
```bash
# If you have rf_binary_artifacts.zip and xgb_multiclass_artifacts.zip in the root:
mkdir -p backend/artifacts
unzip -o rf_binary_artifacts.zip -d backend/artifacts
unzip -o xgb_multiclass_artifacts.zip -d backend/artifacts
```

---

### 2. Backend Setup & Run

#### Linux / macOS
```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python3.12 -m venv .venv
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. (Optional) Configure environment variables
cp .env.example .env

# 5. Run verification script
python scripts/verify_artifacts.py

# 6. Run pytest test suite
PYTHONPATH=. pytest tests

# 7. Start the FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Windows (PowerShell)
```powershell
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r requirements.txt

# 4. (Optional) Configure environment variables
Copy-Item .env.example .env

# 5. Run verification script
python scripts\verify_artifacts.py

# 6. Run pytest test suite
$env:PYTHONPATH="."
pytest tests

# 7. Start the FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend health check is live at: `http://localhost:8000/api/health`

---

### 3. Frontend Setup & Run

#### Linux / macOS
```bash
# 1. In a new terminal, navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. (Optional) Create local env file
cp .env.local.example .env.local

# 4. Start Next.js development server
npm run dev
# or build and start production server:
# npm run build && npm run start -p 3000
```

#### Windows (PowerShell)
```powershell
# 1. In a new terminal, navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. (Optional) Create local env file
Copy-Item .env.local.example .env.local

# 4. Start Next.js development server
npm run dev
```

Open your browser and navigate to: **`http://localhost:3000`**

---

## 🔍 Preprocessing Contract

The preprocessing pipeline strictly reproduces the notebook training transformations:
1. Column names are lowercased and stripped of whitespace.
2. Flow identifier columns (`id`, `srcip`, `dstip`, `stime`, `ltime`) are discarded to prevent data leakage.
3. Ground truth labels (`label`, `attack_cat`) are set aside for comparison only. If `attack_cat` is blank and `label` is 0, it is labeled `"Normal"`.
4. Validates that all 42 required features from `feature_order.json` exist; returns **HTTP 422** with missing column names if any are missing.
5. Encodes categorical columns (`proto`, `service`, `state`) using the pre-fitted `OrdinalEncoder`. Unseen values encode to `-1`.
6. Casts feature columns to `float32`, replaces `NaN` or `inf` with `0.0`.
7. Preserves unencoded raw feature values for display in the inspection drawer.

---

## 📊 Measured Benchmark Metrics (Spot Check)

Every metric in the UI is read directly from `metrics_rf.json` and `metrics_xgb.json`.

| Metric | Random Forest (Binary) | XGBoost (Multiclass) |
| :--- | :--- | :--- |
| **Accuracy** | **89.15%** (`0.891524...`) | **72.58%** (`0.725768...`) |
| **Attack Recall** | **97.99%** (`0.979947...`) | — |
| **Macro-F1** | — | **52.24%** (`0.522414...`) |
| **Weighted-F1** | **90.87%** | **76.72%** (`0.767201...`) |
| **ROC-AUC** | **0.984** (`0.983760...`) | — |
| **False Alarm Rate** | **21.68%** | — |

*Spot check confirmation*:
- `metrics_rf.json`: Accuracy = `0.8915245591021717`, ROC-AUC = `0.9837600916123923`
- `metrics_xgb.json`: Accuracy = `0.7257688383617549`, Macro-F1 = `0.5224149432227048`

---

## 🤖 AI Explanation & LLM Configuration

The backend supports an optional integration with Anthropic Claude for generating plain-English analyst summaries.
In `backend/.env`:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
LLM_MODEL=claude-3-5-sonnet-20241022
```
> [!NOTE]
> Check [Anthropic's documentation](https://docs.anthropic.com/en/docs/about-claude/models) for the latest model IDs. If no API key or model is provided, NetSentinel seamlessly uses a deterministic analyst template fallback so the demo remains 100% functional.

---

## 🧪 Testing & Verification

Run the test suite from the `backend/` directory:
```bash
# Verify artifact integrity and pipeline accuracy
python scripts/verify_artifacts.py

# Run all automated tests
PYTHONPATH=. pytest tests -v
```

All 12 unit and integration tests cover:
- Preprocessing parity and schema validation
- Unseen categorical encoding handling (-1)
- HTTP 422 missing column errors
- Model inference & session storage
- TreeSHAP output shape `(1, 10, 43)`
- Detail drawer feature extraction
- Deterministic template fallback