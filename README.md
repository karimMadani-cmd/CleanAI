
CleanAI 🧹✨Automated Data Cleaning & Quality Analysis PlatformCleanAI is an open-source, interactive web application built with Python, Pandas, and Streamlit. It provides an intuitive semi-automated pipeline for data profiling, data quality scoring, safe human-in-the-loop cleaning, and audit report generation.Designed to address the classic "Garbage In, Garbage Out" challenge in data science, CleanAI cuts down data preparation overhead while keeping data transformations fully transparent, safe, and reproducible.📌 Table of ContentsKey FeaturesArchitecture & Tech StackProject Repository StructureInstallation & SetupUsage & Operational WorkflowGround-Truth Case StudyData Quality Scoring ModelTestingRoadmapLicense & Acknowledgments✨ Key Features📊 Automated Profiling & Statistics: Instantly calculates shape, column data types, cardinalities, missingness ratios, and continuous statistical metrics (mean, median, IQR, std dev).🔍 Multi-Dimensional Flaw Detection:Missingness: Identifies NaN, None, empty strings, and whitespace.Duplicates: Detects exact row-level and partial structural duplicates.Categorical Noise: Spotlights casing inconsistency (e.g., morocco vs Morocco) and untrimmed strings.Numeric Outliers: Implements non-parametric Interquartile Range (IQR) detection to flag extreme anomalies.Domain Rules: Highlights invalid domain-specific values (e.g., negative ages).🛠️ Human-in-the-Loop Configurator: Never silently overwrites raw data. Offers configurable strategies per column (Mean, Median, Mode Imputation, Drop, Constant Fill, Standardize Text, Type Cast).💯 Dynamic Data Health Score: Computes a custom 0–100 heuristic Quality Score ($QS$) before and after cleaning.📄 Exportable Clean Data & Audit Trail: Preview side-by-side comparative diffs and export clean CSV/Excel files alongside structured PDF quality audit reports.🏗️ Architecture & Tech Stack[ Uploaded File Stream ]
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
TechnologyRolePython 3.10+Core application logic and execution environmentPandas & NumPyFast in-memory data manipulation, vector math, and missingness handlingStreamlitMulti-page interactive web UI frameworkPlotly & MatplotlibDynamic visualizations, missingness heatmaps, and IQR boundary chartsOpenPyXLParsing and generating Excel (.xlsx) filesPytestAutomated unit test suite verifying cleaning pipelines📂 Project Repository Structurecleanai/
├── app.py                   # Main Streamlit UI entry point
├── requirements.txt         # Python dependencies
├── README.md                # Project documentation
├── .gitignore               # Ignored files (virtual environments, cache)
├── src/                     # Modular backend application core
│   ├── __init__.py
│   ├── loader.py            # CSV/Excel parsing and ingestion
│   ├── profiler.py          # Summary statistics & structural metadata
│   ├── quality.py           # Missingness, duplicate, & quality score engines
│   ├── outliers.py         # Non-parametric IQR outlier detection logic
│   ├── cleaner.py           # Safe data transformation functions
│   └── report.py            # Audit report generation
├── data/                    # Sample test datasets
│   └── sample_customers.csv
└── tests/                   # Test suite
    └── test_cleaner.py      # Unit testing for transformation logic
⚡ Installation & SetupClone the Repository:git clone https://github.com/your-username/cleanai.git
cd cleanai
Create and Activate a Virtual Environment:macOS/Linux:python3 -m venv venv
source venv/bin/activate
Windows:python -m venv venv
venv\Scripts\activate
Install Dependencies:pip install -r requirements.txt
Launch the Streamlit Web Application:streamlit run app.py
🔄 Usage & Operational WorkflowUpload Dataset: Drag-and-drop a dirty CSV or Excel file (up to 50MB).Profile & Diagnose: View initial metrics, structural shape, data heatmaps, and baseline Quality Score.Review Suggestions: Inspect automated recommendations for missing fields, exact duplicates, and numerical outliers.Configure Cleaning Strategy: Select custom remediation strategies (e.g., Median Imputation for continuous columns, Title Casing for string categories).Execute & Compare: Apply deterministic transformations and review a live side-by-side comparative diff of raw vs. cleaned data.Export Output: Download the sanitized dataset (.csv or .xlsx) and executive PDF audit summary.🧪 Ground-Truth Case StudyBelow is an example of raw input transformations processed through CleanAI:Raw Input (sample_customers.csv)IDNameAgeCountryEmailJoin_DateIdentified Issue101Karim Mansour20Moroccokarim@gmail.com2023-01-15Baseline Valid Row102Sara Hadadi21moroccosara@gmail.com2023-02-10Categorical casing noise (morocco)103Ali AmraniNaNMOROCCOali@gmail.com2023-01-20Missing numeric entry (Age)101Karim Mansour20Moroccokarim@gmail.com2023-01-15Exact Duplicate Row104John Doe-5USAjohn@gmail.com2023-03-01Invalid domain boundary (Age = -5)106Fatima Z.145Moroccofatima@gmail.com2023-03-15Extreme IQR Outlier (Age = 145)Cleaned Output (customers_cleaned.csv)IDNameAgeCountryEmailJoin_DateRemediation Applied101Karim Mansour20Moroccokarim@gmail.com2023-01-15Preserved baseline row102Sara Hadadi21Moroccosara@gmail.com2023-02-10Normalized title-casing & stripped spaces103Ali Amrani25Moroccoali@gmail.com2023-01-20Imputed missing Age with median (25)104John DoeNaNUSAjohn@gmail.com2023-03-01Nullified invalid negative age106Fatima Z.NaNMoroccofatima@gmail.com2023-03-15Flagged & nullified extreme outlier📐 Data Quality Scoring ModelCleanAI evaluates dataset health starting at 100 points, deducting weighted penalties proportional to detected flaws:$$QS = \max\left(0, 100 - \left[ w_1 \cdot \left(\frac{N_{\text{missing}}}{N_{\text{total}}}\right) + w_2 \cdot \left(\frac{N_{\text{dup}}}{N_{\text{rows}}}\right) + w_3 \cdot \left(\frac{N_{\text{invalid}}}{N_{\text{total}}}\right) + w_4 \cdot \left(\frac{N_{\text{outliers}}}{N_{\text{numeric}}}\right) \right] \times 100 \right)$$Weights: Missingness ($w_1 = 40\%$), Duplicates ($w_2 = 25\%$), Invalid Logic ($w_3 = 20\%$), Outliers ($w_4 = 15\%$).🧪 TestingTo run backend transformation and logic unit tests using pytest:pytest tests/
🗺️ Roadmap[x] v1.0 (MVP): File uploads (CSV/XLSX), IQR outlier detection, Streamlit UI, human-in-the-loop cleaning, PDF/CSV export.[ ] v2.0 (Advanced Analytics): Z-score anomaly detection, automated skewness correction, and multi-table profiling.[ ] v3.0 (AI Integrations): LLM-powered natural language dataset explanations and automated entity resolution.[ ] v4.0 (Enterprise Cloud): Direct SQL / Cloud Storage (PostgreSQL, Snowflake, S3) connectors and REST API endpoints.📄 License & AcknowledgmentsDistributed under the MIT License. See LICENSE for details. Built as an open-source technical portfolio project demonstrating end-to-end data engineering, software architecture, and interactive dashboard creation.
