# CleanAI 

**Automated Data Cleaning & Quality Analysis Platform**

CleanAI is an open-source, interactive web application built with Python, Pandas, and Streamlit[cite: 1, 7]. It provides an intuitive semi-automated pipeline for data profiling, data quality scoring, safe human-in-the-loop cleaning, and audit report generation[cite: 1].

Designed to address the classic "Garbage In, Garbage Out" challenge in data science[cite: 1, 2], CleanAI cuts down data preparation overhead while keeping data transformations fully transparent, safe, and reproducible[cite: 2, 8].

---

## Table of Contents

- [Key Features](#-key-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Repository Structure](#-project-repository-structure)
- [Installation & Setup](#-installation--setup)
- [Usage & Operational Workflow](#-usage--operational-workflow)
- [Ground-Truth Case Study](#-ground-truth-case-study)
- [Data Quality Scoring Model](#-data-quality-scoring-model)
- [Testing](#-testing)
- [Roadmap](#-roadmap)
- [License & Acknowledgments](#-license--acknowledgments)

---

##  Key Features

-  **Automated Profiling & Statistics:** Instantly calculates dataset shape, column data types, cardinalities, missingness ratios, and continuous statistical metrics (mean, median, IQR, std dev)[cite: 4].
-  **Multi-Dimensional Flaw Detection:**
  - **Missingness:** Identifies `NaN`, `None`, empty strings, and whitespace[cite: 4].
  - **Duplicates:** Detects exact row-level and partial structural duplicates[cite: 5].
  - **Categorical Noise:** Spotlights casing inconsistencies (e.g., `morocco` vs `Morocco`) and untrimmed strings[cite: 5].
  - **Numeric Outliers:** Implements non-parametric Interquartile Range (IQR) detection to flag extreme anomalies[cite: 5].
  - **Domain Rules:** Highlights invalid domain-specific values (e.g., negative ages)[cite: 5].
-  **Human-in-the-Loop Configurator:** Never silently overwrites raw data. Offers configurable strategies per column (Mean, Median, Mode Imputation, Drop, Constant Fill, Standardize Text, Type Cast)[cite: 3, 4, 5].
-  **Dynamic Data Health Score:** Computes a custom 0–100 heuristic Quality Score ($QS$) before and after cleaning.
-  **Exportable Clean Data & Audit Trail:** Preview side-by-side comparative diffs and export clean CSV/Excel files alongside structured PDF quality audit reports.

---

##  Architecture & Tech Stack

```text
[ Uploaded File Stream ]
           │
           ▼
┌──────────────────────┐
│   Data Ingestion     │  ---> loader.py
└──────────┬───────────┘
           │
     Pandas DataFrame
           │
           ├──────────────────────┐
           ▼                      ▼
┌─────────────────────┐  ┌─────────────────────┐
│   Stats Profiler    │  │   Quality Engine    │
│    profiler.py      │  │ quality.py / outlier│
└─────────────────────┘  └──────────┬──────────┘
                                    │
                            Diagnostic Dict
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Cleaning Engine   │  <--- Human-in-the-Loop
                         │     cleaner.py      │       Config Rules
                         └──────────┬──────────┘
                                    │
                          Clean DF + Audit Log
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Export Layer     │  ---> report.py
                         │  CSV / Excel / PDF  │
                         └─────────────────────┘
