
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

        const extension = file.name
            .slice(file.name.lastIndexOf("."))
            .toLowerCase();

        let workbook;

        if (extension === ".csv") {
            // Récupérer l'encodage choisi par l'utilisateur
            const encodingSelector = document.getElementById("fileEncoding");
            const encoding = encodingSelector
                ? encodingSelector.value
                : "UTF-8";

            // Décoder le CSV avec l'encodage sélectionné
            const decoder = new TextDecoder(encoding);
            const csvText = decoder.decode(buffer);

            // Lire le contenu CSV déjà décodé
            workbook = XLSX.read(csvText, {
                type: "string",
                raw: false
            });
        } else {
            // Conserver la lecture habituelle des fichiers Excel
            workbook = XLSX.read(buffer, {
                type: "array"
            });
        }


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

        // 4. Compter les lignes dupliquées en ignorant les colonnes ID.
const seenRows = new Set();
let duplicateRows = 0;

dataRows.forEach(row => {
    const rowKey = getDuplicateKey(row, header);

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
  
    // Animation GSAP des cartes de statistiques
    if (typeof gsap !== "undefined") {
        gsap.from(dashboard.querySelectorAll(".metric-card"), {
            y: 20,
            opacity: 0,
            scale: 0.98,
            duration: 0.4,
            stagger: 0.1,
            ease: "power2.out"
        });
    }
  
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

    // Repérer les colonnes qui contiennent un âge.
const ageColumns = headers
    .map((header, index) => ({
        name: String(header ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase(),
        index
    }))
    .filter(column => column.name.includes("age"))
    .map(column => column.index);

    rows.forEach((row, index) => {
        const values = Array.from(
            { length: columnCount },
            (_, column) => String(row[column] ?? "").trim()
        );

const key = getDuplicateKey(row, headers);
        const issues = [];

        if (values.some(value => value === "")) {
            issues.push("Valeurs manquantes");
        }

        // Détecter les âges impossibles ou invraisemblables.
ageColumns.forEach(column => {
    const value = values[column];

    // Ignorer les valeurs vides : elles sont déjà signalées.
    if (value === "") return;

    const age = Number(value);

    if (Number.isFinite(age) && (age < 0 || age > 100)) {
        issues.push("Âge aberrant");
    }
});

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
            <div class="diagnostic-stat">
    <strong>${rowIssues.filter(row => row.issues.includes("Âge aberrant")).length}</strong>
    <span>Lignes avec un âge aberrant</span>
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

function isIdColumn(header) {
    const normalizedHeader = String(header ?? "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

    return [
        "id",
        "idclient",
        "clientid",
        "identifiant",
        "identifiantclient"
    ].includes(normalizedHeader);
}

function getDuplicateKey(row, headers) {
    // Ignorer les colonnes d'identification.
    let columnsToCompare = headers
        .map((header, index) => ({ header, index }))
        .filter(column => !isIdColumn(column.header));

    // Si toutes les colonnes sont des identifiants,
    // comparer toutes les colonnes pour éviter les faux doublons.
    if (columnsToCompare.length === 0) {
        columnsToCompare = headers.map((header, index) => ({
            header,
            index
        }));
    }

    const normalizedValues = columnsToCompare.map(({ index }) =>
        String(row[index] ?? "")
            .trim()
            .toLocaleLowerCase("fr")
    );

    return JSON.stringify(normalizedValues);
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
    <label for="duplicateStrategy">Lignes dupliquées</label>
<select id="duplicateStrategy">
    <option value="keep">Conserver les doublons</option>
    <option value="remove">Supprimer les doublons</option>
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
    const duplicateSelect = section.querySelector("#duplicateStrategy");
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
            // Détecter automatiquement les colonnes d'âge.
const headerName = String(cleanedData.headers[column] ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const isAgeColumn = headerName.includes("age");

// Remplacer les âges aberrants par des valeurs manquantes.
if (isAgeColumn) {
    cleanedData.rows.forEach(row => {
        const value = String(row[column] ?? "").trim();

        if (value !== "") {
            const age = Number(value);

            if (Number.isFinite(age) && (age < 0 || age > 100)) {
                row[column] = "";
            }
        }
    });
}
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
        if (duplicateSelect.value === "remove") {
            const seenRows = new Set();

            cleanedData.rows = cleanedData.rows.filter(row => {
                const rowKey = getDuplicateKey(row, cleanedData.headers);

                if (seenRows.has(rowKey)) {
                    return false;
                }

                seenRows.add(rowKey);
                return true;
            });
        }

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

    const originalRows = originalData.rows;
    const cleanedRows = cleanedData.rows;
    const removedRows = Math.max(0, originalRows.length - cleanedRows.length);

    // Associer chaque ligne nettoyée à la ligne originale la plus proche.
    // Cela évite de comparer systématiquement des lignes différentes
    // lorsque certaines lignes ont été supprimées.
    const matchedOriginalIndexes = new Map();
    const usedOriginalIndexes = new Set();

    cleanedRows.forEach((cleanedRow, cleanedIndex) => {
        let bestIndex = -1;
        let bestScore = -1;

        originalRows.forEach((originalRow, originalIndex) => {
            if (usedOriginalIndexes.has(originalIndex)) {
                return;
            }

            let score = 0;

            originalData.headers.forEach((_, columnIndex) => {
                const originalValue = String(originalRow[columnIndex] ?? "");
                const cleanedValue = String(cleanedRow[columnIndex] ?? "");

                if (originalValue === cleanedValue) {
                    score++;
                }
            });

            if (score > bestScore) {
                bestScore = score;
                bestIndex = originalIndex;
            }
        });

        if (bestIndex !== -1) {
            matchedOriginalIndexes.set(cleanedIndex, bestIndex);
            usedOriginalIndexes.add(bestIndex);
        }
    });

    // Une cellule rouge dans l'original indique une valeur modifiée
    // ou une ligne supprimée. Une cellule verte après nettoyage
    // indique une valeur modifiée ou complétée.
    const originalRowsHTML = originalRows.slice(0, 10).map((row, rowIndex) => {
        const matchedCleanedIndex = [...matchedOriginalIndexes.entries()]
            .find(([, originalIndex]) => originalIndex === rowIndex)?.[0];

        if (matchedCleanedIndex === undefined) {
            return `
                <tr class="row-deleted">
                    ${originalData.headers.map((_, columnIndex) => `
                        <td class="cell-deleted">
                            ${escapeHTML(row[columnIndex] ?? "")}
                        </td>
                    `).join("")}
                </tr>
            `;
        }

        const cleanedRow = cleanedRows[matchedCleanedIndex];

        return `
            <tr>
                ${originalData.headers.map((_, columnIndex) => {
                    const originalValue = String(row[columnIndex] ?? "");
                    const cleanedValue = String(cleanedRow[columnIndex] ?? "");
                    const changed = originalValue !== cleanedValue;

                    return `
                        <td class="${changed ? "cell-changed" : ""}">
                            ${escapeHTML(row[columnIndex] ?? "")}
                        </td>
                    `;
                }).join("")}
            </tr>
        `;
    }).join("");

    const cleanedRowsHTML = cleanedRows.slice(0, 10).map((row, rowIndex) => {
        const originalIndex = matchedOriginalIndexes.get(rowIndex);
        const originalRow = originalIndex !== undefined
            ? originalRows[originalIndex]
            : null;

        return `
            <tr>
                ${cleanedData.headers.map((_, columnIndex) => {
                    const cleanedValue = String(row[columnIndex] ?? "");
                    const originalValue = originalRow
                        ? String(originalRow[columnIndex] ?? "")
                        : "";

                    const changed = originalRow && originalValue !== cleanedValue;
                    const imputed = originalRow &&
                        originalValue.trim() === "" &&
                        cleanedValue.trim() !== "";

                    let cellClass = "";

                    if (imputed) {
                        cellClass = "cell-imputed";
                    } else if (changed) {
                        cellClass = "cell-cleaned";
                    }

                    return `
                        <td class="${cellClass}">
                            ${escapeHTML(row[columnIndex] ?? "")}
                        </td>
                    `;
                }).join("")}
            </tr>
        `;
    }).join("");

    section.innerHTML = `
        <div class="comparison-heading">
            <p class="eyebrow">AVANT / APRÈS</p>
            <h2>Résultat du nettoyage</h2>
            <p>Comparez vos données avant et après leur transformation.</p>
        </div>

        <div class="comparison-stats">
            <div class="comparison-stat">
                <span>Lignes originales</span>
                <strong>${originalRows.length}</strong>
            </div>

            <div class="comparison-stat">
                <span>Lignes nettoyées</span>
                <strong>${cleanedRows.length}</strong>
            </div>

            <div class="comparison-stat">
                <span>Lignes supprimées</span>
                <strong>${removedRows}</strong>
            </div>
        </div>

        <div class="comparison-legend">
            <span><i class="legend-color legend-red"></i> Valeur modifiée ou ligne supprimée dans l'original</span>
            <span><i class="legend-color legend-green"></i> Valeur nettoyée</span>
            <span><i class="legend-color legend-light-green"></i> Valeur manquante complétée</span>
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
                            ${originalRowsHTML}
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
                            ${cleanedRowsHTML}
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
            <button type="button" id="exportPDF" class="cleaning-button">
    Exporter le rapport PDF
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

    <div class="score-circle" data-score="${audit.score}">
        <svg viewBox="0 0 120 120" aria-label="Score de qualité sur 100">
            <circle class="score-circle-bg"
                    cx="60" cy="60" r="50" />

            <circle class="score-circle-progress"
                    cx="60" cy="60" r="50" />
        </svg>

        <div class="score-circle-value">
            <strong class="score-number">0</strong>
            <small>/100</small>
        </div>
    </div>

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
    
    // Animer le cercle et le nombre du score
    if (typeof gsap !== "undefined") {
        const circle = section.querySelector(".score-circle-progress");
        const scoreNumber = section.querySelector(".score-number");
        const score = Number(audit.score);
        const circumference = 2 * Math.PI * 50;

        gsap.to(circle, {
            strokeDashoffset: circumference * (1 - score / 100),
            duration: 1.2,
            ease: "power2.out"
        });

        const counter = { value: 0 };

        gsap.to(counter, {
            value: score,
            duration: 1.2,
            ease: "power2.out",
            onUpdate: () => {
                scoreNumber.textContent = Math.round(counter.value);
            }
        });
    }

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
    { length: cleanedData.columnCount },
    (_, index) => {
        const header = String(cleanedData.headers[index] ?? "")
            .trim()
            .toLowerCase();

        // Ignorer les colonnes servant d'identifiant unique.
        if (header === "id" || header.endsWith("_id")) {
            return null;
        }

        return String(row[index] ?? "")
            .trim()
            .toLowerCase();
    }
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

/* ===================================
   ANIMATIONS GSAP - CLEANAI
=================================== */

document.addEventListener("DOMContentLoaded", () => {
    // Vérifier que GSAP est disponible
    if (typeof gsap === "undefined") {
        console.warn("GSAP n'est pas chargé.");
        return;
    }

    // Apparition de la barre du pipeline
    gsap.from(".pipeline-nav", {
        y: -15,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out"
    });

    // Apparition progressive des étapes
    gsap.from(".pipeline-step", {
        y: 10,
        opacity: 0,
        duration: 0.4,
        stagger: 0.08,
        ease: "power2.out",
        delay: 0.15
    });
});

function getCleanAILogoSVG() {
    return `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="160" height="160" viewBox="0 0 40 40"
         fill="none">
        <rect width="40" height="40" rx="13" fill="#056653"/>
        <path d="M30 7C17 7 8 14 8 24C8 30 12 34 18 33C28 31 32 19 30 7Z"
              fill="#D9F3A5"/>
        <path d="M10 31C15 24 20 19 28 12"
              stroke="#FFFFFF"
              stroke-width="2.5"
              stroke-linecap="round"/>
        <path d="M29 3L31 8L36 10L31 12L29 17L27 12L22 10L27 8Z"
              fill="#FFFFFF"/>
    </svg>`;
}

function svgToPng(svgString) {
    return new Promise((resolve, reject) => {
        const blob = new Blob([svgString], {
            type: "image/svg+xml;charset=utf-8"
        });

        const url = URL.createObjectURL(blob);
        const image = new Image();

        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 160;
            canvas.height = 160;

            const context = canvas.getContext("2d");
            context.drawImage(image, 0, 0, 160, 160);

            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/png"));
        };

        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Impossible de convertir le logo CleanAI."));
        };

        image.src = url;
    });
}


async function exportQualityReportPDF() {
    if (!originalData || !cleanedData) {
        alert("Veuillez d'abord importer un fichier et effectuer le nettoyage.");
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("La bibliothèque PDF n'est pas chargée. Vérifiez votre connexion Internet.");
        return;
    }
    const logoPng = await svgToPng(getCleanAILogoSVG());
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;

    const green = [8, 127, 104];
    const darkGreen = [5, 102, 83];
    const mauve = [133, 91, 166];
    const dark = [35, 43, 55];
    const muted = [105, 116, 130];
    const light = [245, 248, 247];
    const paleGreen = [225, 245, 235];
    const paleRed = [254, 235, 235];
    const red = [185, 48, 48];
    const white = [255, 255, 255];

    const originalRows = originalData.rows;
    const cleanedRows = cleanedData.rows;

    const countMissing = (rows) => {
        let count = 0;

        rows.forEach(row => {
            row.forEach(value => {
                if (
                    value === null ||
                    value === undefined ||
                    String(value).trim() === ""
                ) {
                    count++;
                }
            });
        });

        return count;
    };

    const countDuplicates = (rows) => {
        const seen = new Set();
        let duplicates = 0;

        rows.forEach(row => {
            const key = getDuplicateKey(row, originalData.headers);

            if (seen.has(key)) {
                duplicates++;
            } else {
                seen.add(key);
            }
        });

        return duplicates;
    };

    const missingBefore = countMissing(originalRows);
    const missingAfter = countMissing(cleanedRows);
    const duplicatesBefore = countDuplicates(originalRows);
    const duplicatesAfter = countDuplicates(cleanedRows);
    const removedRows = Math.max(0, originalRows.length - cleanedRows.length);

    const auditSection = document.getElementById("qualityAuditSection");
    const scoreElement = auditSection
        ? auditSection.querySelector(".score-number")
        : null;

    const score = scoreElement
        ? scoreElement.textContent.trim()
        : "Non disponible";

    const scoreLabel = score === "Non disponible"
        ? score
        : `${score}/100`;

    const date = new Date().toLocaleDateString("fr-FR");

    // En-tête du rapport CleanAI
    pdf.setFillColor(...darkGreen);
    pdf.rect(0, 0, pageWidth, 43, "F");

// Logo CleanAI identique à celui du site
pdf.addImage(logoPng, "PNG", margin, 5, 16, 16);

// Nom du logo
pdf.setTextColor(255, 255, 255);
pdf.setFont("helvetica", "bold");
pdf.setFontSize(23);
pdf.text("CleanAI", 36, 17);

pdf.setFont("helvetica", "normal");
pdf.setFontSize(9);
pdf.text("SMART DATA CLEANING", 36, 24);

    pdf.setFontSize(17);
    pdf.setFont("helvetica", "bold");
    pdf.text("Rapport de qualite", margin, 37);

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Genere le ${date}`, pageWidth - margin, 36, {
        align: "right"
    });


    // Introduction
    let y = 55;

    pdf.setTextColor(...dark);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Vue d'ensemble", margin, y);

    y += 7;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...muted);
    pdf.text(
        "Synthese de la qualite des donnees avant et apres nettoyage.",
        margin,
        y
    );

    // Cartes statistiques
    y += 8;
    const gap = 4;
    const cardWidth = (contentWidth - gap * 3) / 4;
    const cardHeight = 27;

    const metrics = [
        {
            label: "Score qualite",
            value: scoreLabel,
            color: mauve
        },
        {
            label: "Lignes finales",
            value: String(cleanedRows.length),
            color: green
        },
        {
            label: "Valeurs manquantes",
            value: `${missingBefore} > ${missingAfter}`,
            color: missingAfter < missingBefore ? green : red
        },
        {
            label: "Lignes supprimees",
            value: String(removedRows),
            color: green
        }
    ];

    metrics.forEach((metric, index) => {
        const x = margin + index * (cardWidth + gap);

        pdf.setFillColor(...light);
        pdf.setDrawColor(225, 232, 229);
        pdf.roundedRect(x, y, cardWidth, cardHeight, 3, 3, "FD");

        pdf.setFillColor(...metric.color);
        pdf.roundedRect(x, y, 2, cardHeight, 1, 1, "F");

        pdf.setTextColor(...muted);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.text(metric.label, x + 5, y + 8);

        pdf.setTextColor(...metric.color);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(metric.value.length > 10 ? 10 : 14);
        pdf.text(metric.value, x + 5, y + 19);
    });

    // Tableau comparatif
    y += cardHeight + 15;

    pdf.setTextColor(...dark);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Comparaison avant / apres", margin, y);

    y += 7;

    const columns = [
        { label: "Indicateur", x: margin, width: 65 },
        { label: "Avant", x: margin + 65, width: 36 },
        { label: "Apres", x: margin + 101, width: 36 },
        { label: "Evolution", x: margin + 137, width: contentWidth - 137 }
    ];

    pdf.setFillColor(...darkGreen);
    pdf.roundedRect(margin, y, contentWidth, 10, 2, 2, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...white);

    columns.forEach(column => {
        pdf.text(column.label, column.x + 3, y + 6.5);
    });

    y += 10;

    const tableRows = [
        {
            label: "Nombre de lignes",
            before: String(originalRows.length),
            after: String(cleanedRows.length),
            result: removedRows > 0 ? `-${removedRows} ligne(s)` : "Inchange"
        },
        {
            label: "Valeurs manquantes",
            before: String(missingBefore),
            after: String(missingAfter),
            result: missingAfter < missingBefore
                ? "Amelioration"
                : missingAfter === missingBefore
                    ? "Inchange"
                    : "A verifier"
        },
        {
            label: "Lignes dupliquees",
            before: String(duplicatesBefore),
            after: String(duplicatesAfter),
            result: duplicatesAfter < duplicatesBefore
                ? "Amelioration"
                : duplicatesAfter === duplicatesBefore
                    ? "Inchange"
                    : "A verifier"
        }
    ];

    tableRows.forEach((row, index) => {
        pdf.setFillColor(...(index % 2 === 0 ? light : white));
        pdf.rect(margin, y, contentWidth, 12, "F");

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...dark);
        pdf.text(row.label, columns[0].x + 3, y + 7.5);
        pdf.text(row.before, columns[1].x + 3, y + 7.5);
        pdf.text(row.after, columns[2].x + 3, y + 7.5);

        const isImproved = row.result === "Amelioration";
        pdf.setTextColor(...(isImproved ? green : muted));
        pdf.text(row.result, columns[3].x + 3, y + 7.5);

        y += 12;
    });

    // Conclusion
    y += 12;

    pdf.setFillColor(...paleGreen);
    pdf.roundedRect(margin, y, contentWidth, 29, 3, 3, "F");

    pdf.setTextColor(...darkGreen);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("Bilan du nettoyage", margin + 5, y + 8);

    let conclusion;

    if (missingAfter === 0 && duplicatesAfter === 0) {
        conclusion =
            "Aucune valeur manquante ni ligne dupliquee detectee dans les donnees nettoyees.";
    } else if (missingAfter < missingBefore || duplicatesAfter < duplicatesBefore) {
        conclusion =
            "La qualite des donnees s'est amelioree, mais certaines anomalies peuvent encore necessiter une verification.";
    } else {
        conclusion =
            "Certaines anomalies restent presentes. Examinez les diagnostics et les regles de nettoyage appliquees.";
    }

    pdf.setTextColor(...dark);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);

    const conclusionLines = pdf.splitTextToSize(
        conclusion,
        contentWidth - 10
    );

    pdf.text(conclusionLines, margin + 5, y + 16);

    // Pied de page
    pdf.setDrawColor(225, 232, 229);
    pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    pdf.setTextColor(...muted);
    pdf.setFontSize(8);
    pdf.text("CleanAI | Rapport genere automatiquement", margin, pageHeight - 9);
    pdf.text("1", pageWidth - margin, pageHeight - 9, { align: "right" });

    pdf.save("CleanAI_Rapport_Qualite.pdf");

    const message = document.getElementById("exportMessage");

    if (message) {
        message.textContent = "Le rapport PDF a ete telecharge.";
    }
}

document.addEventListener("click", function (event) {
    if (event.target && event.target.id === "exportPDF") {
        exportQualityReportPDF();
    }
});

