
const dataFile = document.getElementById("dataFile");
const uploadArea = document.getElementById("uploadArea");
const filePreview = document.getElementById("filePreview");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const removeFileButton = document.getElementById("removeFile");
const analyseButton = document.getElementById("analyseButton");
const uploadError = document.getElementById("uploadError");

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
const ALLOWED_EXTENSIONS = [".csv", ".xls", ".xlsx"];

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
        showError("Le fichier dépasse la taille maximale de 10 Mo.");
        return;
    }

    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    uploadArea.hidden = true;
    filePreview.hidden = false;

    // Le bouton reste désactivé : l'analyse réelle
    // n'est pas encore connectée au backend.
    analyseButton.disabled = true;
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

analyseButton.addEventListener("click", () => {
    showError(
        "L'analyse sera disponible lorsque le système de traitement des données sera connecté."
    );
});