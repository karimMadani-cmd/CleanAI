
const dataFile = document.getElementById("dataFile");
const uploadArea = document.getElementById("uploadArea");
const filePreview = document.getElementById("filePreview");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const removeFileButton = document.getElementById("removeFile");
const analyseButton = document.getElementById("analyseButton");
const uploadError = document.getElementById("uploadError");

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 Mo
const ALLOWED_EXTENSIONS = [".csv", ".xls", ".xlsx"];

let analyzedData = null;
let originalData = null;
let cleanedData = null;
let cleaningRules = {};

function showError(message) {
    uploadError.textContent = message;
    uploadError.hidden = false;
}

function clearError() {
    uploadError.textContent = "";
    uploadError.hidden = true;
}

function formatFileSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} octets`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} Ko`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

function resetFile() {
    dataFile.value = "";
    filePreview.hidden = true;
    uploadArea.hidden = false;
    fileName.textContent = "Aucun fichier sélectionné";
    fileSize.textContent = "";
    analyseButton.disabled = true;
    clearError();
}

function handleFile(file) {
    clearError();

    if (!file) {
        resetFile();
        return;
    }

    const extension = file.name
        .slice(file.name.lastIndexOf("."))
        .toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
        resetFile();
        showError("Format invalide. Choisissez un fichier CSV, XLS ou XLSX.");
        return;
    }

    if (file.size === 0) {
        resetFile();
        showError("Le fichier est vide. Choisissez un autre fichier.");
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        resetFile();
        showError("Le fichier dépasse la taille maximale de 50 Mo.");
        return;
    }

    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    uploadArea.hidden = true;
    filePreview.hidden = false;

   // Un fichier valide est sélectionné.
// Le traitement réel sera ajouté dans une prochaine étape.
      analyseButton.disabled = false;
}

dataFile.addEventListener("change", (event) => {
    const file = event.target.files[0];
    handleFile(file);
});

removeFileButton.addEventListener("click", resetFile);

uploadArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadArea.classList.add("drag-over");
});

uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("drag-over");
});

uploadArea.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadArea.classList.remove("drag-over");

    const file = event.dataTransfer.files[0];

    if (!file) return;

    // Affecter le fichier déposé au champ de sélection.
    const transfer = new DataTransfer();
    transfer.items.add(file);
    dataFile.files = transfer.files;

    handleFile(file);
});

analyseButton.addEventListener("click", async () => {
    const file = dataFile.files[0];

    if (!file) {
        showError("Veuillez sélectionner un fichier.");
        return;
    }

    if (typeof XLSX === "undefined") {
        showError("Impossible de charger la bibliothèque de lecture des fichiers.");
        return;
    }

    clearError();
    analyseButton.disabled = true;
    analyseButton.textContent = "Analyse en cours...";

    try {
        // 1. Lire le fichier CSV ou Excel
        const buffer = await file.arrayBuffer();

        const workbook = XLSX.read(buffer, {
            type: "array"
        });

        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
            throw new Error("Le fichier ne contient aucune feuille de données.");
        }

        const worksheet = workbook.Sheets[firstSheetName];

        // 2. Convertir la feuille en tableau JavaScript
        const allRows = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
            raw: false
        });

        // Ignorer les lignes entièrement vides
        const rows = allRows.filter(row =>
            row.some(cell => String(cell ?? "").trim() !== "")
        );

        if (rows.length === 0) {
            throw new Error("Le fichier ne contient aucune donnée.");
        }

        // On considère la première ligne comme l'en-tête
        const header = rows[0];
        const dataRows = rows.slice(1);

        const columnCount = Math.max(
            header.length,
            ...rows.map(row => row.length)
        );

        // 3. Compter les valeurs manquantes
        let missingValues = 0;

        dataRows.forEach(row => {
            for (let column = 0; column < columnCount; column++) {
                const value = row[column];

                if (
                    value === undefined ||
                    value === null ||
                    String(value).trim() === ""
                ) {
                    missingValues++;
                }
            }
        });

        // 4. Compter les lignes dupliquées
        const seenRows = new Set();
        let duplicateRows = 0;

        dataRows.forEach(row => {
            const normalizedRow = Array.from(
                { length: columnCount },
                (_, index) => String(row[index] ?? "").trim()
            );

            const rowKey = JSON.stringify(normalizedRow);

            if (seenRows.has(rowKey)) {
                duplicateRows++;
            } else {
                seenRows.add(rowKey);
            }
        });

// Conserver les données analysées
analyzedData = {
    headers: header.map((value, index) =>
        String(value || `Colonne ${index + 1}`)
    ),
    rows: dataRows.map(row => [...row]),
    columnCount
};

// Conserver une copie intacte des données originales
originalData = {
    headers: [...analyzedData.headers],
    rows: analyzedData.rows.map(row => [...row]),
    columnCount: analyzedData.columnCount
};

// Réinitialiser les règles et les résultats précédents
cleanedData = null;
cleaningRules = {};

// Afficher le tableau de bord
renderDashboard({
    rowCount: dataRows.length,
    columnCount,
    missingValues,
    duplicateRows
});

// Préparer les diagnostics
renderDiagnostics(analyzedData);
// Afficher le configurateur de nettoyage
renderCleaningConfigurator(analyzedData);

    } catch (error) {
        console.error("Erreur pendant l'analyse :", error);
        showError(
            error.message || "Une erreur est survenue pendant la lecture du fichier."
        );
    } finally {
        analyseButton.disabled = false;
        analyseButton.textContent = "Préparer l'analyse";
    }
});

function renderDashboard(stats) {
    let dashboard = document.getElementById("analysisDashboard");

    if (!dashboard) {
        dashboard = document.createElement("section");
        dashboard.id = "analysisDashboard";
        dashboard.className = "analysis-dashboard";

        const uploadCard = document.querySelector(".upload-card");
        uploadCard.insertAdjacentElement("afterend", dashboard);
    }

    dashboard.innerHTML = `
        <div class="dashboard-heading">
            <p class="eyebrow">RÉSULTATS PRÉLIMINAIRES</p>
            <h2>Vue d'ensemble des données</h2>
            <p>Voici les premières statistiques de votre fichier.</p>
        </div>

        <div class="metrics-grid">
            <article class="metric-card">
                <span class="metric-icon">↕</span>
                <p>Nombre de lignes</p>
                <strong>${stats.rowCount}</strong>
            </article>

            <article class="metric-card">
                <span class="metric-icon">▦</span>
                <p>Nombre de colonnes</p>
                <strong>${stats.columnCount}</strong>
            </article>

            <article class="metric-card">
                <span class="metric-icon">!</span>
                <p>Valeurs manquantes</p>
                <strong>${stats.missingValues}</strong>
            </article>

            <article class="metric-card">
                <span class="metric-icon">⧉</span>
                <p>Lignes dupliquées</p>
                <strong>${stats.duplicateRows}</strong>
            </article>
        </div>
    `;

    dashboard.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
    
}
function renderDiagnostics(data) {
    let section = document.getElementById("diagnosticsSection");

    if (!section) {
        section = document.createElement("section");
        section.id = "diagnosticsSection";
        section.className = "diagnostics-section";

        document
            .getElementById("analysisDashboard")
            .insertAdjacentElement("afterend", section);
    }

    const { headers, rows, columnCount } = data;

    const duplicateKeys = new Set();
    const seen = new Set();
    const rowIssues = [];

    rows.forEach((row, index) => {
        const values = Array.from(
            { length: columnCount },
            (_, column) => String(row[column] ?? "").trim()
        );

        const key = JSON.stringify(values);
        const issues = [];

        if (values.some(value => value === "")) {
            issues.push("Valeurs manquantes");
        }

        if (seen.has(key)) {
            issues.push("Ligne dupliquée");
            duplicateKeys.add(key);
        } else {
            seen.add(key);
        }

        rowIssues.push({
            rowNumber: index + 2,
            values,
            issues
        });
    });

    // Détecter les incohérences de casse dans les colonnes textuelles.
    const inconsistentColumns = new Set();

    headers.forEach((_, column) => {
        const variants = new Map();

        rows.forEach(row => {
            const value = String(row[column] ?? "").trim();

            if (value) {
                const normalized = value.toLocaleLowerCase("fr");
                if (!variants.has(normalized)) {
                    variants.set(normalized, new Set());
                }
                variants.get(normalized).add(value);
            }
        });

        for (const variantsSet of variants.values()) {
            if (variantsSet.size > 1) {
                inconsistentColumns.add(column);
            }
        }
    });

    const inconsistentCount = inconsistentColumns.size;

    section.innerHTML = `
        <div class="diagnostics-heading">
            <p class="eyebrow">QUALITÉ DES DONNÉES</p>
            <h2>Diagnostic des données</h2>
            <p>Examinez les lignes et les anomalies détectées.</p>
        </div>

        <div class="diagnostics-summary">
            <div class="diagnostic-stat">
                <strong>${rowIssues.filter(row => row.issues.includes("Valeurs manquantes")).length}</strong>
                <span>Lignes avec valeurs manquantes</span>
            </div>
            <div class="diagnostic-stat">
                <strong>${rowIssues.filter(row => row.issues.includes("Ligne dupliquée")).length}</strong>
                <span>Lignes dupliquées</span>
            </div>
            <div class="diagnostic-stat">
                <strong>${inconsistentCount}</strong>
                <span>Colonnes avec variantes de casse</span>
            </div>
        </div>

        <div class="diagnostics-filters" role="group" aria-label="Filtrer les lignes">
            <button type="button" class="diagnostic-filter active" data-filter="all">
                Toutes les lignes
            </button>
            <button type="button" class="diagnostic-filter" data-filter="dirty">
                Lignes problématiques
            </button>
            <button type="button" class="diagnostic-filter" data-filter="valid">
                Lignes valides
            </button>
        </div>

        <div class="diagnostics-table-wrapper">
            <table class="diagnostics-table">
                <thead>
                    <tr>
                        <th>Ligne</th>
                        ${headers.map((header, index) =>
                            `<th>${escapeHTML(header || `Colonne ${index + 1}`)}</th>`
                        ).join("")}
                        <th>Diagnostic</th>
                    </tr>
                </thead>
                <tbody id="diagnosticsTableBody"></tbody>
            </table>
        </div>

        <p class="diagnostics-note" id="diagnosticsCount"></p>
    `;

    const body = section.querySelector("#diagnosticsTableBody");
    const countLabel = section.querySelector("#diagnosticsCount");
    const filterButtons = section.querySelectorAll(".diagnostic-filter");

    function displayRows(filter = "all") {
        const filteredRows = rowIssues.filter(row => {
            if (filter === "dirty") return row.issues.length > 0;
            if (filter === "valid") return row.issues.length === 0;
            return true;
        });

        body.innerHTML = filteredRows.map(row => `
            <tr class="${row.issues.length ? "row-dirty" : "row-valid"}">
                <td>${row.rowNumber}</td>
                ${row.values.map(value =>
                    `<td>${escapeHTML(value || "—")}</td>`
                ).join("")}
                <td>
                    ${row.issues.length
                        ? row.issues.map(issue =>
                            `<span class="issue-tag">${escapeHTML(issue)}</span>`
                        ).join(" ")
                        : '<span class="valid-tag">Valide</span>'
                    }
                </td>
            </tr>
        `).join("");

        countLabel.textContent =
            `${filteredRows.length} ligne(s) affichée(s) sur ${rows.length}.`;
    }

    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            filterButtons.forEach(item => item.classList.remove("active"));
            button.classList.add("active");
            displayRows(button.dataset.filter);
        });
    });

    displayRows();
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}
function renderCleaningConfigurator(data) {
    let section = document.getElementById("cleaningSection");

    if (!section) {
        section = document.createElement("section");
        section.id = "cleaningSection";
        section.className = "cleaning-section";

        document
            .getElementById("diagnosticsSection")
            .insertAdjacentElement("afterend", section);
    }

    const columnOptions = data.headers.map((header, index) => `
        <option value="${index}">${escapeHTML(header)}</option>
    `).join("");

    section.innerHTML = `
        <div class="cleaning-heading">
            <p class="eyebrow">NETTOYAGE INTELLIGENT</p>
            <h2>Configurer le nettoyage</h2>
            <p>Choisissez une colonne et définissez les règles à appliquer.</p>
        </div>

        <div class="cleaning-card">
            <label for="cleaningColumn">Colonne à nettoyer</label>
            <select id="cleaningColumn">
                ${columnOptions}
            </select>

            <label for="missingStrategy">Valeurs manquantes</label>
            <select id="missingStrategy">
                <option value="none">Ne rien modifier</option>
                <option value="mean">Remplacer par la moyenne (numérique)</option>
                <option value="median">Remplacer par la médiane (numérique)</option>
                <option value="mode">Remplacer par la valeur la plus fréquente</option>
                <option value="drop">Supprimer les lignes concernées</option>
            </select>

            <label for="textStrategy">Format du texte</label>
            <select id="textStrategy">
                <option value="none">Ne rien modifier</option>
                <option value="trim">Supprimer les espaces inutiles</option>
                <option value="title">Mettre En Forme Titre</option>
                <option value="lower">Convertir en minuscules</option>
            </select>

            <button type="button" id="saveCleaningRule" class="cleaning-button">
                Enregistrer la règle
            </button>

            <p id="cleaningMessage" class="cleaning-message" role="status"></p>

            <div id="cleaningRulesList" class="cleaning-rules-list"></div>

            <button type="button" id="executeCleaning" class="cleaning-button">
                Exécuter le nettoyage
            </button>
        </div>
    `;

    const columnSelect = section.querySelector("#cleaningColumn");
    const missingSelect = section.querySelector("#missingStrategy");
    const textSelect = section.querySelector("#textStrategy");
    const message = section.querySelector("#cleaningMessage");
    const rulesList = section.querySelector("#cleaningRulesList");

    function displayRules() {
        const entries = Object.entries(cleaningRules);

        rulesList.innerHTML = entries.length
            ? `<h3>Règles enregistrées</h3>` + entries.map(([index, rule]) => `
                <div class="cleaning-rule">
                    <span>${escapeHTML(data.headers[index])}</span>
                    <span>${escapeHTML(rule.missing)} · ${escapeHTML(rule.text)}</span>
                    <button type="button" data-remove-rule="${index}">
                        Retirer
                    </button>
                </div>
            `).join("")
            : "<p>Aucune règle enregistrée pour le moment.</p>";
    }

    section.querySelector("#saveCleaningRule").addEventListener("click", () => {
        const column = columnSelect.value;

        cleaningRules[column] = {
            missing: missingSelect.value,
            text: textSelect.value
        };

        message.textContent = `Règle enregistrée pour « ${data.headers[column]} ».`;
        displayRules();
    });

    rulesList.addEventListener("click", event => {
        const button = event.target.closest("[data-remove-rule]");

        if (!button) return;

        delete cleaningRules[button.dataset.removeRule];
        message.textContent = "Règle supprimée.";
        displayRules();
    });

    section.querySelector("#executeCleaning").addEventListener("click", () => {
        cleanedData = {
            headers: [...originalData.headers],
            rows: originalData.rows.map(row => [...row]),
            columnCount: originalData.columnCount
        };

        // Supprimer les lignes concernées si une règle "drop" est choisie.
        const columnsToDrop = Object.entries(cleaningRules)
            .filter(([, rule]) => rule.missing === "drop")
            .map(([index]) => Number(index));

        cleanedData.rows = cleanedData.rows.filter(row =>
            !columnsToDrop.some(column =>
                row[column] === undefined ||
                row[column] === null ||
                String(row[column]).trim() === ""
            )
        );

        // Appliquer les autres règles sur une copie des données.
        Object.entries(cleaningRules).forEach(([index, rule]) => {
            const column = Number(index);
            const values = cleanedData.rows.map(row => row[column]);

            const presentValues = values
                .map(value => String(value ?? "").trim())
                .filter(Boolean);

            let replacement = "";

            if (rule.missing === "mode" && presentValues.length) {
                const counts = new Map();

                presentValues.forEach(value => {
                    counts.set(value, (counts.get(value) || 0) + 1);
                });

                replacement = [...counts.entries()]
                    .sort((a, b) => b[1] - a[1])[0][0];
            }

            if (["mean", "median"].includes(rule.missing)) {
                const numbers = presentValues.map(Number);

                if (
                    numbers.length &&
                    numbers.every(Number.isFinite)
                ) {
                    if (rule.missing === "mean") {
                        replacement = String(
                            numbers.reduce((sum, value) => sum + value, 0) /
                            numbers.length
                        );
                    } else {
                        numbers.sort((a, b) => a - b);

                        const middle = Math.floor(numbers.length / 2);

                        replacement = String(
                            numbers.length % 2
                                ? numbers[middle]
                                : (numbers[middle - 1] + numbers[middle]) / 2
                        );
                    }
                }
            }

            cleanedData.rows.forEach(row => {
                const value = String(row[column] ?? "");
                const isMissing = value.trim() === "";

                if (isMissing && rule.missing !== "none" && rule.missing !== "drop") {
                    if (replacement !== "") {
                        row[column] = replacement;
                    }
                }

                if (rule.text === "trim") {
                    row[column] = String(row[column] ?? "").trim();
                } else if (rule.text === "lower") {
                    row[column] = String(row[column] ?? "").toLocaleLowerCase("fr");
                } else if (rule.text === "title") {
                    row[column] = String(row[column] ?? "")
                        .toLocaleLowerCase("fr")
                        .replace(/\b\p{L}/gu, character => character.toLocaleUpperCase("fr"));
                }
            });
        });

        message.textContent =
            `Nettoyage terminé : ${cleanedData.rows.length} ligne(s) conservée(s).`;

        renderCleaningPreview();
        renderComparison();
        renderQualityAudit(cleanedData);
    });

    displayRules();
}

function renderCleaningPreview() {
    let preview = document.getElementById("cleaningPreview");

    if (!preview) {
        preview = document.createElement("section");
        preview.id = "cleaningPreview";
        preview.className = "cleaning-preview";

        document
            .getElementById("cleaningSection")
            .insertAdjacentElement("afterend", preview);
    }

    if (!cleanedData) return;

    preview.innerHTML = `
        <h2>Aperçu des données nettoyées</h2>
        <p>Vérifiez les résultats avant de les exporter.</p>
        <div class="diagnostics-table-wrapper">
            <table class="diagnostics-table">
                <thead>
                    <tr>
                        ${cleanedData.headers.map(header =>
                            `<th>${escapeHTML(header)}</th>`
                        ).join("")}
                    </tr>
                </thead>
                <tbody>
                    ${cleanedData.rows.slice(0, 100).map(row => `
                        <tr>
                            ${cleanedData.headers.map((_, index) =>
                                `<td>${escapeHTML(row[index] ?? "")}</td>`
                            ).join("")}
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
        <p class="diagnostics-note">
            ${Math.min(cleanedData.rows.length, 100)} ligne(s) affichée(s).
            Le fichier original reste inchangé.
        </p>
    `;

    preview.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderComparison() {
    if (!originalData || !cleanedData) {
        return;
    }

    let section = document.getElementById("comparisonSection");

    if (!section) {
        section = document.createElement("section");
        section.id = "comparisonSection";
        section.className = "comparison-section";

        document.getElementById("cleaningPreview")
            .insertAdjacentElement("afterend", section);
    }

    const removedRows = originalData.rows.length - cleanedData.rows.length;

    section.innerHTML = `
        <div class="comparison-heading">
            <p class="eyebrow">AVANT / APRÈS</p>
            <h2>Résultat du nettoyage</h2>
            <p>Comparez vos données avant et après leur transformation.</p>
        </div>

        <div class="comparison-stats">
            <div class="comparison-stat">
                <span>Lignes originales</span>
                <strong>${originalData.rows.length}</strong>
            </div>

            <div class="comparison-stat">
                <span>Lignes nettoyées</span>
                <strong>${cleanedData.rows.length}</strong>
            </div>

            <div class="comparison-stat">
                <span>Lignes supprimées</span>
                <strong>${removedRows}</strong>
            </div>
        </div>

        <div class="comparison-grid">
            <div class="comparison-card">
                <h3>Données originales</h3>
                <div class="diagnostics-table-wrapper">
                    <table class="diagnostics-table">
                        <thead>
                            <tr>
                                ${originalData.headers.map(header =>
                                    `<th>${escapeHTML(header)}</th>`
                                ).join("")}
                            </tr>
                        </thead>
                        <tbody>
                            ${originalData.rows.slice(0, 10).map(row => `
                                <tr>
                                    ${originalData.headers.map((_, index) =>
                                        `<td>${escapeHTML(row[index] ?? "")}</td>`
                                    ).join("")}
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="comparison-card">
                <h3>Données nettoyées</h3>
                <div class="diagnostics-table-wrapper">
                    <table class="diagnostics-table">
                        <thead>
                            <tr>
                                ${cleanedData.headers.map(header =>
                                    `<th>${escapeHTML(header)}</th>`
                                ).join("")}
                            </tr>
                        </thead>
                        <tbody>
                            ${cleanedData.rows.slice(0, 10).map(row => `
                                <tr>
                                    ${cleanedData.headers.map((_, index) =>
                                        `<td>${escapeHTML(row[index] ?? "")}</td>`
                                    ).join("")}
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <p class="diagnostics-note">
            Les tableaux affichent jusqu'à 10 lignes chacun.
            Le fichier original n'a pas été modifié.
        </p>
        <div class="export-actions">
    <button type="button" id="exportCSV" class="cleaning-button">
        Exporter en CSV
    </button>

<button type="button" id="exportExcel" class="cleaning-button">
Exporter en Excel
</button>
<p id="exportMessage" role="status"></p>
</div>
        `;

   section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderQualityAudit(data) {
    const audit = calculateQualityAudit(data);

    if (!audit) {
        return;
    }

    let section = document.getElementById("qualityAuditSection");

    if (!section) {
        section = document.createElement("section");
        section.id = "qualityAuditSection";
        section.className = "quality-audit-section";

        const comparison = document.getElementById("comparisonSection");

        if (comparison) {
            comparison.insertAdjacentElement("afterend", section);
        } else {
            document.getElementById("cleaningSection")
                .insertAdjacentElement("afterend", section);
        }
    }

    let qualityLabel = "À améliorer";

    if (audit.score >= 90) {
        qualityLabel = "Excellente";
    } else if (audit.score >= 75) {
        qualityLabel = "Bonne";
    } else if (audit.score >= 50) {
        qualityLabel = "Moyenne";
    }

    section.innerHTML = `
        <div class="quality-audit-heading">
            <p class="eyebrow">AUDIT DE QUALITÉ</p>
            <h2>Qualité de vos données</h2>
            <p>Un aperçu de la qualité du jeu de données analysé.</p>
        </div>

        <div class="quality-audit-card">
            <div class="quality-score">
                <span>Score de qualité</span>
                <strong>${audit.score}<small>/100</small></strong>
                <p>${qualityLabel}</p>
            </div>

            <div class="quality-progress">
                <div class="quality-progress-track">
                    <div class="quality-progress-fill"
                         style="width: ${audit.score}%"></div>
                </div>
            </div>

            <div class="quality-audit-stats">
                <div>
                    <span>Nombre de lignes</span>
                    <strong>${audit.totalRows}</strong>
                </div>
                <div>
                    <span>Nombre de colonnes</span>
                    <strong>${audit.totalColumns}</strong>
                </div>
                <div>
                    <span>Cellules manquantes</span>
                    <strong>${audit.missingCells}</strong>
                </div>
                <div>
                    <span>Lignes dupliquées</span>
                    <strong>${audit.duplicateRows}</strong>
                </div>
            </div>

            <p class="quality-audit-note">
                Le score est un indicateur simplifié fondé sur les cellules
                manquantes et les lignes dupliquées.
            </p>
        </div>
    `;
}


function exportCleanedData(format) {
    if (!cleanedData) {
        alert("Veuillez d'abord exécuter le nettoyage.");
        return;
    }

const exportRows = [
cleanedData.headers,
...cleanedData.rows
];
const worksheet = XLSX.utils.aoa_to_sheet(exportRows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Donnees nettoyees");
if (format === "csv") {
const csv = XLSX.utils.sheet_to_csv(worksheet, {
FS: ";"
});
const blob = new Blob(
["\uFEFF" + csv],
{ type: "text/csv;charset=utf-8;" }
);
const url = URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = url;
link.download = "cleanai_donnees_nettoyees.csv";
link.click();
URL.revokeObjectURL(url);
} else {
XLSX.writeFile(
workbook,
"cleanai_donnees_nettoyees.xlsx"
);
}
const message = document.getElementById("exportMessage");
if (message) {
message.textContent = "Exportation terminée.";
}
}
document.addEventListener("click", event => {
if (event.target.closest("#exportCSV")) {
exportCleanedData("csv");
}
if (event.target.closest("#exportExcel")) {
exportCleanedData("excel");
}
});

function calculateQualityAudit(data) {
    if (!data || !data.headers || !data.rows) {
        return null;
    }

    const totalRows = data.rows.length;
    const totalColumns = data.headers.length;
    const totalCells = totalRows * totalColumns;

    if (totalCells === 0) {
        return {
            score: 0,
            missingCells: 0,
            duplicateRows: 0,
            totalRows,
            totalColumns,
            totalCells: 0
        };
    }

    let missingCells = 0;
    const seenRows = new Set();
    let duplicateRows = 0;

    data.rows.forEach(row => {
        for (let column = 0; column < totalColumns; column++) {
            const value = row[column];

            if (
                value === undefined ||
                value === null ||
                String(value).trim() === ""
            ) {
                missingCells++;
            }
        }

        const normalizedRow = Array.from(
            { length: totalColumns },
            (_, index) => String(row[index] ?? "").trim()
        );

        const rowKey = JSON.stringify(normalizedRow);

        if (seenRows.has(rowKey)) {
            duplicateRows++;
        } else {
            seenRows.add(rowKey);
        }
    });

    const missingRate = missingCells / totalCells;
    const duplicateRate = duplicateRows / totalRows;

    const score = Math.max(
        0,
        Math.round(100 * (1 - missingRate * 0.6 - duplicateRate * 0.4))
    );

    return {
        score,
        missingCells,
        duplicateRows,
        totalRows,
        totalColumns,
        totalCells
    };
}
