# NetSentinel: UNSW-NB15 intrusion detection live demo (Next.js + FastAPI)

*Prompt for the Antigravity agent. Paste this whole document as the task.*

## 0. How to work

1. Read this whole document and everything in `backend/artifacts/` before writing code. Then write a short implementation plan (stack, folder layout, endpoints, assumptions, risks) and follow it.
2. Build and verify the backend first (tests plus a real run on `sample_flows.csv`), then the frontend, then check the whole thing in a browser.
3. Never invent numbers. Every metric shown in the UI must be read from the metrics files in the artifacts folder. If a file or field is missing, show a clear empty state, not a made-up value.
4. I am a beginner. Keep dependencies minimal, comment anything non-obvious, and write a README with exact copy-paste commands for Windows, macOS and Linux.
5. If something in this document conflicts with what you find in the artifacts, trust the artifacts, tell me, and note it in the README. Ask me only when you are genuinely blocked.

## 1. What we are building

A web demo for a network intrusion detector trained on the original UNSW-NB15 training/testing split. The user uploads a CSV or Parquet file of network flows (or clicks Try sample flows). The backend runs two models:

- Random Forest (binary): normal vs attack. Gives an attack probability per flow.
- XGBoost (multiclass): 10 classes (Normal plus 9 attack types) with a probability for each.

The UI shows a summary, a results table, a detail drawer per flow with the top features behind the XGBoost decision, and an Explain with AI button that produces a plain-English analyst note grounded in those features. A second area shows the models' measured test-set performance.

Be honest in the UI: this is a replay of dataset flows, not live packet capture. The input must follow the UNSW-NB15 feature schema (the features were produced by the Argus and Bro-IDS tools, so arbitrary captured traffic will not work).

## 2. Artifacts that already exist (do not retrain anything)

I will place these files in `backend/artifacts/`. They were produced by two Colab notebooks.

- `feature_order.json`: keys `feature_order` (list of the exact feature column names, in training order), `categorical_cols` (list, normally proto, service, state) and `categories` (map from each categorical column to the list of values seen in training).
- `encoder.joblib`: a scikit-learn OrdinalEncoder fitted on the categorical columns (in the order of `categorical_cols`) with unknown values encoded as -1.
- `rf_binary.joblib`: scikit-learn RandomForestClassifier. `predict_proba(X)[:, 1]` is the probability of attack.
- `xgb_multiclass.json`: XGBClassifier saved with `save_model`. Load it with `XGBClassifier().load_model(path)`.
- `classes.json`: list of class names. The index in this list equals the class index the XGBoost model outputs.
- `metrics_rf.json`: binary metrics (accuracy, precision\_attack, recall\_attack, f1\_attack, roc\_auc, pr\_auc, false\_alarm\_rate, miss\_rate, timing, and `by_attack_type`, a list of records with attack\_cat, share\_flagged\_as\_attack and n\_flows).
- `metrics_xgb.json`: multiclass metrics (accuracy, macro\_f1, weighted\_f1, `recall_per_class` map, classification\_report, `confusion_matrix` as a list of rows in the order of classes.json, timing, best\_iteration).
- `versions.json`: library versions used for training.
- `sample_flows.csv`: up to 30 test flows per class in the raw schema, including the true `label` (0 or 1) and `attack_cat` columns.
- `results_rf.png`, `results_xgb.png`: training plots (optional, may be shown in the performance section).

Read `versions.json` and pin scikit-learn, xgboost, numpy and pandas to exactly those versions in `backend/requirements.txt`. A version mismatch can break loading the pickled Random Forest. If those versions do not install on the local Python, tell me instead of silently upgrading.

## 3. Preprocessing contract (must match training exactly)

Implement one function used by every endpoint:

1. Read CSV or Parquet with pandas. Lowercase and strip all column names.
2. Drop these columns if present: id, srcip, dstip, stime, ltime. Set `label` and `attack_cat` aside (if present) for comparison only; they are never model inputs.
3. If `attack_cat` is empty and `label` is 0, treat it as Normal.
4. Check that every name in `feature_order` exists. If any are missing, return HTTP 422 listing the missing names. Ignore extra columns.
5. Convert the categorical columns to stripped strings, then apply `encoder.transform` on them in `categorical_cols` order. Unseen values become -1 (this is expected, not an error).
6. Reorder columns to `feature_order`, cast to float32, and replace NaN or inf with 0.
7. Keep the raw (pre-encoding) values of each row so the UI can show human-readable values such as proto = tcp.

## 4. Repository layout

```
netsentinel/
  README.md
  .gitignore            (ignore .env files, venvs, node_modules, .next, and large model files in backend/artifacts)
  backend/
    app/                main.py, config.py, schemas.py, preprocessing.py, models.py,
                        explain.py, llm.py, sessions.py, domain.py
    artifacts/          (my files)
    scripts/verify_artifacts.py
    tests/
    requirements.txt
    .env.example
  frontend/             (Next.js, App Router, TypeScript, Tailwind)
    .env.local.example
```

## 5. Backend (FastAPI)

Python 3.11 or 3.12, FastAPI, uvicorn, pydantic v2, pandas, pyarrow, python-multipart, python-dotenv, joblib, plus the pinned ML libraries. Load all models once at startup (lifespan), not per request. A single worker is fine.

Configuration through environment variables (document them in `.env.example`): FRONTEND\_ORIGIN (default http://localhost:3000, used for CORS), MAX\_UPLOAD\_MB (25), MAX\_ROWS (5000), ANTHROPIC\_API\_KEY (optional), LLM\_MODEL (do not hardcode a default in code; give an example in the README and tell me to check Anthropic's docs for current model IDs).

### Endpoints

- `GET /api/health`: status and whether the models loaded.
- `GET /api/meta`: feature\_order, categorical info, classes, class descriptions, both metrics files, versions, limits, and `llm_enabled` (true only if an API key is set).
- `POST /api/predict` (multipart field named `file`, csv or parquet): runs preprocessing, then both models. If there are more than MAX\_ROWS rows, process the first MAX\_ROWS and set `truncated` to true. Returns `session_id`, a `summary` (n\_rows, n\_flagged, attack\_rate, counts per predicted XGBoost class, processing\_ms, has\_labels, truncated) and lightweight `rows`: for each row `row_id` (0-based), `rf_attack_prob`, `xgb_class`, `xgb_confidence`, `xgb_probs` (map of class to probability), and, when labels exist, `true_label` and `true_attack_cat`.
- `POST /api/predict/sample`: same output, using `artifacts/sample_flows.csv`.
- `GET /api/results/{session_id}/rows/{row_id}`: full detail for one row: raw feature values, the models' outputs, and `top_features`, the 8 features with the largest absolute contribution to the XGBoost predicted class, each with name, short description, raw value and signed contribution.
- `POST /api/explain` (body: session\_id, row\_id): the backend builds the evidence itself from the stored session (never trust evidence sent by the browser), then returns `explanation` (markdown), `source` (llm or template) and `disclaimer`.

### Contributions (important)

Use XGBoost's built-in TreeSHAP: `booster.predict(DMatrix, pred_contribs=True)`, computed only for the row being opened. For multiclass this should return an array shaped (rows, classes, features + 1), where the last entry is the bias term. Assert this shape at startup with a dummy row and cover it with a test. If the installed version returns something different, adapt and tell me. Contributions are in raw margin (log-odds) units, so present them as relative influence, not as probabilities. Positive means it pushes toward the predicted class.

### Sessions

Keep the last 5 uploads in memory with a 30-minute expiry. Return 404 with a friendly message for an unknown or expired session (the server may have restarted).

### LLM explanation

Server-side only. The API key must never reach the browser or the repo. Use the Anthropic Python SDK behind a tiny provider interface so another provider could be swapped in. Call it only when the user clicks Explain. Send only the compact evidence for that one row (never the file). Use max\_tokens of about 500, low temperature, a 20 second timeout, cache by (session\_id, row\_id), and a simple in-memory rate limit (10 calls per minute per IP). If there is no API key or the call fails, return a deterministic template explanation built from the same evidence, with `source` set to template, so the demo always works. Use the system prompt in section 9 verbatim.

### Safety and robustness

Validate file extension and size, parse with pandas only, never unpickle anything a user uploads (only the trusted files in artifacts), return clear JSON errors (code and message), and log request timing.

### Verification script and tests

`scripts/verify_artifacts.py`: load every artifact, run the pipeline on `sample_flows.csv`, and print binary accuracy, multiclass accuracy and the contribution shape. The sample is stratified by class, so these numbers will not equal the test-set metrics; the point is to confirm the pipeline is not broken (a near-random score means a preprocessing mismatch).

Tests (pytest): preprocessing parity (feature order, an unseen category becomes -1, a missing column gives 422), the predict and sample endpoints, row detail, explain falling back to the template when no key is set, and the contribution shape.

## 6. Domain text to embed (backend/app/domain.py, also served by /api/meta)

Feature descriptions (short, paraphrased from the official UNSW-NB15 feature list; use them as plain-English tooltips):

dur: total record duration. proto: transaction protocol. service: network service such as http, ftp or dns (a dash means none). state: connection state and its dependent protocol. spkts / dpkts: packet counts source to destination and destination to source. sbytes / dbytes: byte counts in each direction. rate: packets per second. sttl / dttl: time-to-live values in each direction. sload / dload: bits per second in each direction. sloss / dloss: packets retransmitted or dropped in each direction. sinpkt / dinpkt: inter-packet arrival time in each direction (ms). sjit / djit: jitter in each direction (ms). swin / dwin: TCP window advertisement in each direction. stcpb / dtcpb: TCP base sequence numbers. tcprtt: TCP connection setup round-trip time (synack + ackdat). synack: time between SYN and SYN\_ACK. ackdat: time between SYN\_ACK and ACK. smean / dmean: mean packet size in each direction. trans\_depth: depth of the HTTP request/response transaction in the connection. response\_body\_len: size of the data returned by the server's HTTP service. ct\_srv\_src: recent connections with the same service and source address. ct\_state\_ttl: recent connections for each state within given TTL ranges. ct\_dst\_ltm: recent connections to the same destination address. ct\_src\_dport\_ltm: recent connections from the same source to the same destination port. ct\_dst\_sport\_ltm: recent connections to the same destination from the same source port. ct\_dst\_src\_ltm: recent connections between the same source and destination pair. is\_ftp\_login: 1 if the FTP session used a user and password. ct\_ftp\_cmd: number of flows with an FTP command. ct\_flw\_http\_mthd: number of flows using HTTP methods such as GET and POST. ct\_src\_ltm: recent connections from the same source address. ct\_srv\_dst: recent connections with the same service and destination address. is\_sm\_ips\_ports: 1 if source and destination IP and port are the same.

Class descriptions: Normal: ordinary traffic. Generic: attacks that work against block ciphers using hash collisions, regardless of cipher structure. Exploits: sequences that take advantage of a software glitch or vulnerability. Fuzzers: feeding random data to try to crash or hang a program or network. DoS: attempts to make a server or network resource unavailable. Reconnaissance: probing that gathers information about a target. Analysis: port scans, spam and web-page penetration attempts. Backdoor: bypassing authentication to gain remote access. Shellcode: small payload used to start a command shell on a target. Worms: self-replicating attacks that spread to other machines.

If a feature name in the artifacts has no description here, show it without a tooltip rather than failing.

## 7. Frontend (Next.js)

Next.js App Router, TypeScript, Tailwind CSS. Keep dependencies small: framer-motion (subtle motion), lucide-react (icons), recharts (charts), @tanstack/react-query (data fetching), react-dropzone (upload). The API base URL comes from NEXT\_PUBLIC\_API\_URL. Write a typed API client with friendly error messages (for example, list the missing columns on a 422).

One main page with these sections, in order:

1. **Header**: small logo mark, the name, and a placeholder link to the GitHub repo.
2. **Hero**: one-line description, the honest note about replayed dataset flows, and two buttons: Upload flows and Try sample flows.
3. **Upload zone**: drag and drop or browse, accepts .csv and .parquet, shows file name and size, skeleton or progress while processing, a clear error state with Retry.
4. **Summary cards**: total flows, flagged as attack, attack rate, most common predicted attack type, processing time. Show a warning chip if the upload was truncated.
5. **Predicted-type chart**: horizontal bars per XGBoost class, using the class colors in section 8.
6. **Results table**: columns for row number, Verdict (Normal or Attack from the Random Forest at the current threshold), Predicted type (XGBoost) with confidence, an attack-probability meter, and, when labels exist, the Actual type with a match or mismatch icon. Controls: a segmented filter (All, Attacks, Normal, and Mismatches when labels exist), a class dropdown, row-number search, sort by attack probability, and pagination (25 per page). Show a small Models disagree pill when the Random Forest says attack but XGBoost's top class is Normal, or the reverse.
7. **Threshold slider** (nice to have): lets the user move the attack threshold (default 0.5) and re-labels verdicts client-side from `rf_attack_prob`, with a short note about the false-alarm versus missed-attack trade-off.
8. **Detail drawer** (right-side panel on desktop, bottom sheet on mobile), opened by clicking a row: a header with the verdict and predicted type; the 10-class probability bars; the top features as diverging bars (positive toward the predicted class, negative against) with tooltips showing each feature's description and raw value; the key raw values in a compact list; and an Explain with AI button. Show a skeleton while loading. Show the result as formatted markdown inside a labeled card: AI summary of model evidence, not ground truth. If `source` is template, add a small note that the AI service was unavailable.
9. **Model performance** (tabs: Binary Random Forest, Multiclass XGBoost), with all numbers read from /api/meta. Binary tab: metric cards (precision, recall, false-alarm rate, ROC-AUC, accuracy) and a detection-rate bar chart by attack type. Multiclass tab: macro-F1 and accuracy cards, per-class recall bars, and a row-normalized confusion matrix heatmap. Add a plain note: the official UNSW-NB15 training set is mostly attacks, so accuracy alone overstates real-world performance and per-class recall matters more.
10. **Footer**: limitations (replay of dataset flows, schema requirement, not a production IDS) and credit to the dataset authors (Moustafa and Slay, UNSW Canberra).

States to handle everywhere: empty (before any upload), loading (skeletons), error (readable message plus Retry), expired session, and an unreachable API (explain how to start the backend).

## 8. Design system: minimal, glassmorphism, light theme only

- **Feel**: calm, airy, lots of whitespace, one accent color, no clutter. Glass is used for surfaces, not decoration. No dark mode.
- **Page background**: base #F5F7FC with three large, heavily blurred color blobs fixed behind everything (lavender #E0E7FF, sky #DBEAFE, mint #D1FAE5 at about 50 to 60 percent opacity). A very slow drift is optional and must stop under prefers-reduced-motion.
- **Glass surface recipe**: background rgba(255,255,255,0.58); backdrop-filter blur(18px) saturate(140%); 1px border rgba(255,255,255,0.7); soft shadow 0 8px 32px rgba(76,94,150,0.10) plus an inset 0 1px 0 rgba(255,255,255,0.8) highlight; radius 20 to 24px. Provide a fallback for browsers without backdrop-filter (solid rgba(255,255,255,0.92)).
- **Text**: primary #0F172A, secondary #475569, muted #64748B. Glass over light backgrounds can lose contrast, so check that body text meets WCAG AA (4.5:1) and raise the surface opacity if it does not.
- **Accent**: indigo #4F46E5 for primary buttons, links, focus rings and selected states. Semantic colors: Normal emerald #10B981, Attack rose #F43F5E, warnings amber #F59E0B.
- **Class colors** (consistent in every chart and badge): Normal #10B981, Generic #6366F1, Exploits #F43F5E, Fuzzers #F59E0B, DoS #8B5CF6, Reconnaissance #0EA5E9, Analysis #14B8A6, Backdoor #EC4899, Shellcode #64748B, Worms #65A30D. Never rely on color alone; always show the class name.
- **Type**: Geist Sans or Inter, tabular numerals for all numbers, comfortable line height, a clear scale (page title about 36 to 44px, section titles 22 to 24px, body 15 to 16px, captions 12 to 13px).
- **Layout**: 8px spacing grid, content width up to 1200px, generous padding, rounded controls, thin 1px borders.
- **Motion**: 150 to 250ms ease-out fades and slides, a 2px hover lift on cards, an animated count-up on the summary cards, no bouncing. Respect prefers-reduced-motion.
- **Responsive and accessible**: works from 360px wide up; visible focus states; keyboard-operable table, drawer (Escape closes, focus is trapped and restored) and tabs; proper aria labels; chart colors paired with text.
- Define all of this as CSS variables or Tailwind theme tokens in one place so the look can be changed easily.

## 9. LLM explanation prompt (use verbatim in backend/app/llm.py)

System prompt:

You are a network-security analyst assistant inside an intrusion-detection demo. You receive the model evidence for ONE network flow: the predicted class, the class probabilities, an attack probability from a separate binary model, and the top features with their values, plain-English descriptions and influence scores (positive means it pushed toward the predicted class). Write a short explanation for a junior analyst.

Rules:

- Use ONLY the evidence provided. Do not invent packet contents, IP addresses, CVEs, tools or causes that the evidence does not imply.
- Use the feature descriptions. Say suggests or is consistent with, never proves.
- Always state the confidence. If the top two class probabilities are close, or the two models disagree, say the call is uncertain.
- 120 to 180 words, in four short parts with these bold headings: What was flagged, Why the model thinks so, How sure it is, What to check next.
- What to check next must be generic, practical analyst steps appropriate to the predicted class (for example, review other flows from the same source), not claims about this specific network.
- If the predicted class is Normal, explain why the flow looks benign instead.
- End with exactly: AI-generated summary of model evidence, not confirmed ground truth.

User message: the evidence as compact JSON (predicted class, top-3 class probabilities, binary attack probability, top features each with name, description, value and influence).

The template fallback should follow the same four-part structure and use only the same evidence.

## 10. Acceptance checklist

- The backend starts with one command, models load once, and `/api/health` reports ok.
- `scripts/verify_artifacts.py` runs and prints sensible scores; pytest passes.
- Uploading the sample file in the UI shows all 10 classes, a populated table and a working drawer with contribution bars.
- Wrong or incomplete files give readable errors (missing columns listed).
- Explain with AI works with a key and falls back to the template without one.
- All metrics shown match the values in the metrics files (spot-check two of them and tell me which).
- No secrets in the repo; `.env.example` files exist; the README gives exact setup and run steps and explains where to put the artifact files.
- Screenshots (or a browser check) of: the empty state, results with the drawer open, the performance tab, and a mobile width.
- Basics: no console errors, the layout holds at 360px, and text contrast is acceptable on the glass surfaces.

## 11. Out of scope for now

Deployment, authentication, a database, live packet capture, and retraining. Keep configuration environment-based so deployment is easy later.
