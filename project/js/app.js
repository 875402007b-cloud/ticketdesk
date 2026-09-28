// ============================================================
// app.js – App shell, sidebar navigation, simple hash router
// ============================================================

import { ICONS, cache } from "./utils.js";

import {
    getShows,
    getStudents,
    getBookings
} from "./api.js";

import { renderDashboard } from "./dashboard.js";

import {
    renderShows,
    renderShowDetails,
    renderManageShows
} from "./shows.js";

import { renderStudents } from "./students.js";

import {
    renderBookTicket,
    renderMyBookings,
    renderBookingDetails
} from "./bookings.js";


// ============================================================
// NAVIGATION ITEMS
// ============================================================

const NAV_ITEMS = [
    {
        id: "dashboard",
        label: "Dashboard",
        icon: "dashboard"
    },
    {
        id: "shows",
        label: "Shows",
        icon: "shows"
    },
    {
        id: "book",
        label: "Book Ticket",
        icon: "ticket"
    },
    {
        id: "bookings",
        label: "My Bookings",
        icon: "bookings"
    },
    {
        id: "students",
        label: "Students",
        icon: "students"
    },
    {
        id: "manage-shows",
        label: "Manage Shows",
        icon: "manage"
    }
];


// ============================================================
// RENDER APP SHELL
// ============================================================

function renderShell() {

    document.querySelector("#app").innerHTML = `
        <div class="app-shell">

            <aside class="sidebar" id="sidebar">

                <div class="sidebar__brand">

                    <div class="sidebar__logo">
                        ${ICONS.ticket}
                    </div>

                    <div class="sidebar__brand-text">
                        <h1>TicketDesk</h1>
                        <span>Campus Booking</span>
                    </div>

                </div>


                <nav class="sidebar__nav" id="nav">

                    ${NAV_ITEMS.map((item) => `
                        <button
                            class="nav-item"
                            data-route="${item.id}"
                        >
                            ${ICONS[item.icon]}
                            <span>${item.label}</span>
                        </button>
                    `).join("")}

                </nav>


                <div class="sidebar__footer">
                    TicketDesk v1.0 · Spring Boot REST API
                </div>

            </aside>


            <div class="main">

                <header class="topbar">

                    <button
                        class="hamburger"
                        id="hamburger"
                        aria-label="Toggle menu"
                    >
                        ${ICONS.menu}
                    </button>

                    <span
                        class="topbar__title"
                        id="topbar-title"
                    >
                        Dashboard
                    </span>

                </header>


                <main
                    class="content"
                    id="content"
                ></main>

            </div>

        </div>
    `;


    // ========================================================
    // SIDEBAR NAVIGATION
    // ========================================================

    document
        .getElementById("nav")
        .addEventListener("click", (e) => {

            const btn = e.target.closest(".nav-item");

            if (!btn) {
                return;
            }

            const route = btn.dataset.route;

            navigate(route);

            document
                .getElementById("sidebar")
                .classList
                .remove("open");
        });


    // ========================================================
    // MOBILE MENU
    // ========================================================

    document
        .getElementById("hamburger")
        .addEventListener("click", () => {

            document
                .getElementById("sidebar")
                .classList
                .toggle("open");

        });
}


// ============================================================
// NAVIGATE
// ============================================================

export function navigate(route, params = {}) {

    const hash = params.id
        ? `#/${route}/${params.id}`
        : `#/${route}`;

    window.location.hash = hash;
}


// ============================================================
// ROUTER
// ============================================================

function handleRoute() {

    const hash = window.location.hash
        .replace(/^#\/?/, "");

    const parts = hash.split("/");

    const route = parts[0] || "dashboard";

    const id = parts[1]
        ? parseInt(parts[1], 10)
        : null;


    // ========================================================
    // ACTIVE NAVIGATION ITEM
    // ========================================================

    document
        .querySelectorAll(".nav-item")
        .forEach((btn) => {

            btn.classList.toggle(
                "active",
                btn.dataset.route === route
            );

        });


    // ========================================================
    // TOP BAR TITLE
    // ========================================================

    const navItem = NAV_ITEMS.find(
        (item) => item.id === route
    );

    document.getElementById(
        "topbar-title"
    ).textContent = navItem
        ? navItem.label
        : "Dashboard";


    // ========================================================
    // CONTENT
    // ========================================================

    const content =
        document.getElementById("content");

    content.innerHTML = "";


    // ========================================================
    // ROUTES
    // ========================================================

    switch (route) {

        case "dashboard":

            renderDashboard(content);

            break;


        case "shows":

            renderShows(content);

            break;


        case "show":

            renderShowDetails(
                content,
                id
            );

            break;


        case "book":

            renderBookTicket(
                content,
                id
            );

            break;


        case "bookings":

            renderMyBookings(content);

            break;


        case "booking":

            renderBookingDetails(
                content,
                id
            );

            break;


        case "students":

            renderStudents(content);

            break;


        case "manage-shows":

            renderManageShows(content);

            break;


        default:

            renderDashboard(content);

            break;
    }
}


// ============================================================
// REFRESH API CACHE
// ============================================================

export async function refreshCache() {

    try {

        const [
            shows,
            students,
            bookings
        ] = await Promise.all([

            getShows().catch(() => []),

            getStudents().catch(() => []),

            getBookings().catch(() => [])

        ]);


        cache.shows =
            Array.isArray(shows)
                ? shows
                : [];


        cache.students =
            Array.isArray(students)
                ? students
                : [];


        cache.bookings =
            Array.isArray(bookings)
                ? bookings
                : [];


    } catch (error) {

        console.error(
            "Unable to refresh cache:",
            error
        );

    }
}


// ============================================================
// INITIALIZE APPLICATION
// ============================================================

function init() {

    renderShell();


    window.addEventListener(
        "hashchange",
        handleRoute
    );


    if (!window.location.hash) {

        navigate("dashboard");

    } else {

        handleRoute();

    }
}


// ============================================================
// START APPLICATION
// ============================================================

init();