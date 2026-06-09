document.addEventListener("DOMContentLoaded", () => {
    initVenuesPage();
    initHomeImageAnimations();
});

function initVenuesPage() {
    const dateInput = document.getElementById("venue-date-filter");
    if (!dateInput) return;

    refreshVenuesCalendarState();
    setInterval(refreshVenuesCalendarState, 60000);

    dateInput.addEventListener("change", () => loadVenuesTable());

    const searchInput = document.getElementById("venue-search");
    const venueFilter = document.getElementById("venue-name-filter");
    const statusFilter = document.getElementById("venue-status-filter");
    if (searchInput) searchInput.addEventListener("input", () => loadVenuesTable());
    if (venueFilter) venueFilter.addEventListener("change", () => loadVenuesTable());
    if (statusFilter) statusFilter.addEventListener("change", () => loadVenuesTable());
}

let venuesMonthKey = null;

function formatISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getCurrentMonthBounds() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    return {
        year,
        month,
        min: formatISODate(now),
        max: formatISODate(new Date(year, month, lastDay)),
        today: formatISODate(now),
        monthKey: `${year}-${month}`,
    };
}

function isDateInCurrentMonth(dateStr, bounds) {
    if (!dateStr) return false;
    const [year, month] = dateStr.split("-").map(Number);
    return year === bounds.year && month === bounds.month + 1;
}

function refreshVenuesCalendarState() {
    const bounds = getCurrentMonthBounds();
    const headingEl = document.getElementById("venues-month-year");
    const dateInput = document.getElementById("venue-date-filter");

    if (headingEl) {
        headingEl.textContent = "Upcoming Bookings";
    }

    if (!dateInput) return;

    dateInput.min = bounds.min;
    dateInput.max = ""; // Allow any future date

    if (dateInput.value && dateInput.value < bounds.min) {
        dateInput.value = bounds.today;
    }
    
    if (venuesMonthKey === null) {
        venuesMonthKey = "initialized";
        loadVenuesTable();
    }
}

function formatDisplayDate(dateStr) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

let dropdownsPopulated = false;

async function loadVenuesTable() {
    const tbody = document.getElementById("venues-table-body");
    if (!tbody) return;

    const colCount = 7;
    const bounds = getCurrentMonthBounds();
    const dateInput = document.getElementById("venue-date-filter");
    let selectedDate = dateInput?.value || "";

    if (selectedDate && selectedDate < bounds.min) {
        selectedDate = bounds.today;
        if (dateInput) dateInput.value = bounds.today;
    }

    tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center; padding: 20px;">Loading...</td></tr>`;

    if (typeof fetchBookings === "undefined") {
        tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center;">Error: supabase.js not loaded</td></tr>`;
        return;
    }

    const bookings = await fetchBookings();
    tbody.innerHTML = "";

    if (bookings.error && bookings.length === undefined) {
        tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center;">No bookings found.</td></tr>`;
        return;
    }

    populateFilterDropdowns(bookings);

    const searchVal = (document.getElementById("venue-search")?.value || "").toLowerCase();
    const venueVal  = document.getElementById("venue-name-filter")?.value || "";
    const statusVal = document.getElementById("venue-status-filter")?.value || "";

    let filtered = bookings.filter((b) => b.Date >= bounds.min);
    if (selectedDate) {
        filtered = filtered.filter((b) => b.Date === selectedDate);
    }
    if (venueVal)  filtered = filtered.filter((b) => b.Venue === venueVal);
    if (statusVal) filtered = filtered.filter((b) => (b.Status || "") === statusVal);
    if (searchVal) filtered = filtered.filter((b) =>
        [b.Function_Name, b.Department_Name, b.Coordinator, String(b.contact_no || ""), b.Venue]
            .some((f) => (f || "").toLowerCase().includes(searchVal))
    );

    if (filtered.length === 0) {
        const dateText = selectedDate ? formatDisplayDate(selectedDate) : "upcoming dates";
        tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center; padding: 20px;">No booked venues for ${dateText}.</td></tr>`;
        return;
    }

    filtered.forEach((b, index) => {
        const tr = document.createElement("tr");
        tr.className = "row-booked";
        tr.innerHTML = `
            <td class="row-index">${String(index + 1).padStart(2, "0")}</td>
            <td class="venue-name-cell">${b.Venue || "—"}</td>
            <td>${b.Department_Name || "—"}</td>
            <td>${b.Function_Name || "—"}</td>
            <td>${b.Date ? b.Date.split('-').reverse().join('-') : "—"}</td>
            <td>${b['Time(from)'] || "—"}</td>
            <td>${b['Time(to)'] || "—"}</td>
        `;
        tbody.appendChild(tr);
    });
}

function populateFilterDropdowns(bookings) {
    if (dropdownsPopulated) return;
    const venueSelect  = document.getElementById("venue-name-filter");
    const statusSelect = document.getElementById("venue-status-filter");
    if (venueSelect) {
        [...new Set(bookings.map((b) => b.Venue).filter(Boolean))].sort().forEach((v) => {
            if (!Array.from(venueSelect.options).some(opt => opt.value === v)) {
                const opt = document.createElement("option");
                opt.value = v; opt.textContent = v;
                venueSelect.appendChild(opt);
            }
        });
    }
    if (statusSelect) {
        [...new Set(bookings.map((b) => b.Status).filter(Boolean))].sort().forEach((s) => {
            const opt = document.createElement("option");
            opt.value = s; opt.textContent = s;
            statusSelect.appendChild(opt);
        });
    }
    dropdownsPopulated = true;
}

function clearVenueFilters() {
    const bounds = getCurrentMonthBounds();
    const searchInput  = document.getElementById("venue-search");
    const venueFilter  = document.getElementById("venue-name-filter");
    const dateInput    = document.getElementById("venue-date-filter");
    const statusFilter = document.getElementById("venue-status-filter");
    if (searchInput)  searchInput.value  = "";
    if (venueFilter)  venueFilter.value  = "";
    if (dateInput)    dateInput.value    = "";
    if (statusFilter) statusFilter.value = "";
    loadVenuesTable();
}

function initHomeImageAnimations() {
    if (!document.querySelector(".facilities-showcase-container")) return;

    const loadedUrls = new Map();

    function preloadImage(url) {
        if (loadedUrls.has(url)) return loadedUrls.get(url);

        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.decoding = "async";
            img.onload = () => resolve(url);
            img.onerror = reject;
            img.src = url;
        });

        loadedUrls.set(url, promise);
        return promise;
    }

    function stashBackgroundUrl(el) {
        const url = getBackgroundUrl(el);
        if (url) {
            el.dataset.bg = url;
            el.style.backgroundImage = "none";
        }
        return url;
    }

    function revealFrame(canvas, frame, url) {
        frame.style.backgroundImage = `url("${url}")`;
        canvas.classList.remove("image-slide-pending");
        requestAnimationFrame(() => {
            canvas.classList.add("image-slide-in");
        });
    }

    const heroCanvas = document.querySelector(".hero-frame-section .hero-image-canvas");
    if (heroCanvas) {
        heroCanvas.classList.add("image-launch-pending");
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                heroCanvas.classList.remove("image-launch-pending");
                heroCanvas.classList.add("image-launch-in");
            });
        });
    }

    const heroLogo = document.querySelector(".hero-inserted-logo");
    if (heroLogo) {
        heroLogo.classList.add("logo-launch-in");
    }

    const lazyCanvases = document.querySelectorAll(
        ".facilities-showcase-container .hero-image-canvas"
    );

    lazyCanvases.forEach((canvas) => {
        const frame = canvas.querySelector(".clean-image-frame");
        if (!frame) return;

        const url = stashBackgroundUrl(frame);
        if (!url) return;

        canvas.classList.add(
            "image-slide-pending",
            canvas.classList.contains("canvas-left") ? "slide-from-left" : "slide-from-right"
        );
    });

    if (lazyCanvases.length === 0 || !("IntersectionObserver" in window)) return;

    const scrollObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                const canvas = entry.target;
                scrollObserver.unobserve(canvas);

                const frame = canvas.querySelector(".clean-image-frame");
                const url = frame?.dataset.bg;
                if (!frame || !url) return;

                preloadImage(url)
                    .then(() => revealFrame(canvas, frame, url))
                    .catch(() => {
                        frame.style.backgroundImage = `url("${url}")`;
                        canvas.classList.remove("image-slide-pending");
                        canvas.classList.add("image-slide-in");
                    });
            });
        },
        { rootMargin: "60px", threshold: 0.15 }
    );

    lazyCanvases.forEach((canvas) => scrollObserver.observe(canvas));
}

function getBackgroundUrl(el) {
    if (el.dataset.bg) return el.dataset.bg;

    const inline = el.style.backgroundImage;
    if (inline && inline !== "none") {
        const match = inline.match(/url\(["']?([^"')]+)["']?\)/);
        if (match) return match[1];
    }

    return null;
}
