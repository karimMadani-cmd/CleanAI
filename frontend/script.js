
// =====================================
// 1. INITIALISATION
// =====================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("CleanAI est prêt !");

    initMobileMenu();
    initServiceButtons();
    initScrollAnimations();
});


// =====================================
// 2. MENU MOBILE
// =====================================

function initMobileMenu() {
    const navbar = document.querySelector(".navbar");
    const navLinks = document.querySelector(".nav-links");

    if (!navbar || !navLinks) return;

    // Création du bouton de menu
    const menuButton = document.createElement("button");

    menuButton.type = "button";
    menuButton.className = "menu-toggle";
    menuButton.textContent = "☰";
    menuButton.setAttribute("aria-label", "Ouvrir le menu");
    menuButton.setAttribute("aria-expanded", "false");

    navbar.insertBefore(menuButton, navLinks);

    menuButton.addEventListener("click", () => {
        const isOpen = navLinks.classList.toggle("is-open");

        menuButton.textContent = isOpen ? "✕" : "☰";
        menuButton.setAttribute("aria-expanded", String(isOpen));
        menuButton.setAttribute(
            "aria-label",
            isOpen ? "Fermer le menu" : "Ouvrir le menu"
        );
    });

    // Fermer le menu après avoir choisi une section
    navLinks.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("is-open");
            menuButton.textContent = "☰";
            menuButton.setAttribute("aria-expanded", "false");
            menuButton.setAttribute("aria-label", "Ouvrir le menu");
        });
    });
}


// =====================================
// 3. INTERACTIONS DES SERVICES
// =====================================

function initServiceButtons() {
    const buttons = document.querySelectorAll(
        ".nav-button, .primary-button"
    );

    buttons.forEach((button) => {
        button.addEventListener("click", (event) => {
            const target = document.querySelector("#services");

            if (!target) return;

            // Les liens avec une ancre continuent à fonctionner normalement.
            // On affiche simplement un message de confirmation.
            if (button.classList.contains("primary-button")) {
                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

                showNotification(
                    "Bienvenue dans l'univers des solutions CleanAI !"
                );
            }
        });
    });
}


// =====================================
// 4. NOTIFICATION INTERACTIVE
// =====================================

function showNotification(message) {
    let notification = document.querySelector(".cleanai-notification");

    if (!notification) {
        notification = document.createElement("div");
        notification.className = "cleanai-notification";
        notification.setAttribute("role", "status");
        notification.setAttribute("aria-live", "polite");
        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.classList.add("is-visible");

    // Annuler la fermeture précédente si une nouvelle notification arrive.
    if (notification.hideTimeout) {
        clearTimeout(notification.hideTimeout);
    }

    notification.hideTimeout = setTimeout(() => {
        notification.classList.remove("is-visible");
    }, 3500);
}


// =====================================
// 5. ANIMATIONS AU DÉFILEMENT
// =====================================

function initScrollAnimations() {
    const elements = document.querySelectorAll(
        ".intro, .service-card"
    );

    // Afficher normalement les éléments si cette API n'est pas disponible.
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
        (entries, currentObserver) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    currentObserver.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.15
        }
    );

    elements.forEach((element) => {
        element.classList.add("reveal");
        observer.observe(element);
    });
}