# CleanAI

> Intelligent Data Cleaning and Data Quality Analysis Platform

CleanAI is a software project designed to help users **upload, analyze, detect, clean, and export datasets** automatically.

The project is divided into three main parts:

* **Frontend** — User interface
* **Backend** — API and application logic
* **Python / AI** — Data analysis, cleaning, and intelligent processing

---

## 🏗️ Project Architecture

```text
                         ┌─────────────────┐
                         │      USER       │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │    FRONTEND     │
                         │   Web Interface │
                         └────────┬────────┘
                                  │
                              HTTP / API
                                  │
                                  ▼
                         ┌─────────────────┐
                         │     BACKEND     │
                         │    REST API     │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  PYTHON / AI    │
                         │ Data Processing │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │     DATASET     │
                         └─────────────────┘
```

---

## 📁 Project Structure

```text
CleanAI/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── src/
│   ├── tests/
│   └── requirements.txt
│
├── python/
│   ├── src/
│   │   ├── loader.py
│   │   ├── profiler.py
│   │   ├── quality.py
│   │   ├── cleaner.py
│   │   ├── outliers.py
│   │   └── report.py
│   │
│   ├── tests/
│   └── requirements.txt
│
├── data/
│   └── sample_customers.csv
│
├── docs/
│
├── .gitignore
├── README.md
└── docker-compose.yml
```

---

## 🚀 Main Workflow

CleanAI follows this workflow:

```text
Upload
   ↓
Profile
   ↓
Detect Problems
   ↓
Generate Suggestions
   ↓
User Confirmation
   ↓
Clean Data
   ↓
Export
```

### 1. Upload

The user uploads a dataset such as a CSV file.

### 2. Profile

CleanAI analyzes the dataset:

* Number of rows
* Number of columns
* Data types
* Missing values
* Duplicate rows
* Basic statistics

### 3. Detect Problems

The system detects possible data-quality problems:

* Missing values
* Duplicates
* Invalid values
* Incorrect formats
* Outliers

### 4. Suggest

CleanAI proposes possible corrections.

### 5. Confirm

The user reviews the proposed changes before applying them.

### 6. Clean

The cleaning operations are applied to the dataset.

### 7. Export

The cleaned dataset and quality report can be exported.

---

# 🧩 Project Components

## Frontend

The frontend is responsible for the user interface.

Main responsibilities:

* Dataset upload
* Dashboard
* Data preview
* Quality visualization
* Cleaning suggestions
* User confirmation
* Download/export

---

## Backend

The backend provides the API between the frontend and the Python processing system.

Main responsibilities:

* REST API
* Request validation
* Dataset management
* User management
* Communication with Python
* Database communication

---

## Python / AI

The Python component handles the data processing and intelligent analysis.

Main modules:

| Module        | Responsibility               |
| ------------- | ---------------------------- |
| `loader.py`   | Load datasets                |
| `profiler.py` | Analyze dataset structure    |
| `quality.py`  | Detect data-quality problems |
| `cleaner.py`  | Clean datasets               |
| `outliers.py` | Detect outliers              |
| `report.py`   | Generate quality reports     |

---

# 👥 Team Organization

The project is divided into three teams.

### Frontend Team

Responsible for:

```text
frontend/
```

### Backend Team

Responsible for:

```text
backend/
```

### Python / AI Team

Responsible for:

```text
python/
```

The project director coordinates the three teams and reviews important Pull Requests.

---

# 🌿 Git Workflow

The `main` branch contains stable versions of the project.

The `develop` branch is used for development.

Developers should create feature branches from `develop`.

Example:

```text
main
 │
 └── develop
       │
       ├── feature/frontend-dashboard
       ├── feature/backend-api
       ├── feature/python-profiler
       ├── feature/python-cleaner
       └── feature/outlier-detection
```

### Workflow

```text
Create Issue
     ↓
Create Feature Branch
     ↓
Develop
     ↓
Commit
     ↓
Push
     ↓
Pull Request
     ↓
Code Review
     ↓
Merge into develop
     ↓
Release
     ↓
Merge into main
```

---

# 📋 Development Rules

1. Do not work directly on `main`.
2. Create an Issue before starting a significant task.
3. Create a feature branch for your task.
4. Write clear commit messages.
5. Test your code before creating a Pull Request.
6. Pull Requests should be reviewed before merging.
7. Do not commit passwords, API keys, or secrets.
8. Keep code documented and readable.

---

# 📝 Commit Convention

We use conventional commit messages.

Examples:

```text
feat: add dataset profiler
fix: handle empty csv files
docs: update README
test: add cleaner tests
refactor: simplify quality analysis
chore: update dependencies
```

---

# 🧪 Testing

Each component should contain tests.

Example:

```text
python/
└── tests/
    └── test_cleaner.py

backend/
└── tests/

frontend/
└── tests/
```

Before creating a Pull Request, developers should make sure that the tests pass.

---

# 🎯 MVP

The first version of CleanAI should focus on:

* CSV upload
* Dataset profiling
* Missing-value detection
* Duplicate detection
* Basic data cleaning
* Outlier detection
* Cleaning suggestions
* User confirmation
* Cleaned CSV export
* Basic quality report

---

# 🗓️ Development Roadmap

## Phase 1 — Project Initialization

* [ ] Create GitHub repository
* [ ] Configure project structure
* [ ] Configure development environment
* [ ] Add documentation
* [ ] Add sample dataset

## Phase 2 — Data Processing

* [ ] Implement dataset loader
* [ ] Implement profiler
* [ ] Implement quality analysis
* [ ] Implement cleaner
* [ ] Implement outlier detection
* [ ] Implement report generation

## Phase 3 — Backend

* [ ] Create API
* [ ] Connect backend with Python
* [ ] Implement dataset endpoints
* [ ] Implement cleaning endpoints
* [ ] Add backend tests

## Phase 4 — Frontend

* [ ] Create dashboard
* [ ] Create upload interface
* [ ] Display dataset information
* [ ] Display detected problems
* [ ] Display cleaning suggestions
* [ ] Add confirmation interface
* [ ] Add export/download

## Phase 5 — Integration

* [ ] Connect frontend and backend
* [ ] Connect backend and Python
* [ ] Test complete workflow
* [ ] Fix integration problems

## Phase 6 — Release

* [ ] Final testing
* [ ] Documentation
* [ ] Security review
* [ ] Performance review
* [ ] First stable release

---

# 🔒 Security

CleanAI should follow basic security practices:

* Validate uploaded files
* Limit file sizes
* Never trust user input
* Protect API endpoints
* Never commit secrets
* Validate data before processing

---

# 📌 Project Status

**Status:** 🚧 In Development

CleanAI is currently under active development.

---

# 📄 License

This project is licensed under the MIT License.
