const navToggle = document.querySelector(".nav-toggle");
const siteHeader = document.querySelector(".site-header");
const siteNav = document.querySelector(".site-nav");
const pages = Array.from(document.querySelectorAll("[data-page]"));
const mainLinks = Array.from(document.querySelectorAll("[data-page-link]"));
const pageSections = Array.from(document.querySelectorAll(".page-section[id]"));
const signupForm = document.querySelector(".signup-form");
const formNote = document.querySelector(".form-note");

const events = [
  {
    date: "2026-05-18",
    title: "Spring Service Planning Meeting",
    summary: "Members meet to assign event roles, confirm supplies, and prepare outreach materials."
  },
  {
    date: "2026-06-06",
    title: "Community Benefit Performance",
    summary: "Student musicians share a short program supporting children and family care projects."
  },
  {
    date: "2026-07-12",
    title: "Summer Donation Drive",
    summary: "A collection day for school supplies, care items, and volunteer packing support."
  },
  {
    date: "2026-03-09",
    title: "Winter Reflection Meetup",
    summary: "Members reviewed project results and collected ideas for the next service cycle."
  },
  {
    date: "2025-12-14",
    title: "Holiday Music Outreach",
    summary: "A seasonal volunteer performance and care-card project for local partners."
  }
];

const newsItems = [
  {
    date: "2026-04-20",
    title: "New site structure prepared",
    summary: "Music Angels Hands now has dedicated spaces for programs, events, gallery, news, and volunteer information."
  },
  {
    date: "2026-03-22",
    title: "Board archive placeholders added",
    summary: "Board years are now organized so current leadership can stay open while older years remain easy to browse."
  },
  {
    date: "2026-02-10",
    title: "Program newsletter planning begins",
    summary: "Future program updates will be generated from Markdown files on the client side."
  }
];

const galleryCollections = {
  "current-year": [
    { section: "Spring Projects", photos: ["Planning Meeting", "Volunteer Table", "Music Practice", "Donation Prep"] },
    { section: "Member Moments", photos: ["Team Photo", "Student Leaders", "Workshop Notes"] }
  ],
  performances: [
    { section: "Benefit Concerts", photos: ["Piano Solo", "Ensemble", "Audience Welcome"] },
    { section: "Community Visits", photos: ["Warmup", "Program Sheet", "Closing Song"] }
  ],
  "service-projects": [
    { section: "Donation Drives", photos: ["Sorting Supplies", "Packing Boxes", "Delivery Prep"] },
    { section: "Care Campaigns", photos: ["Cards", "Care Kits", "Partner Table"] }
  ]
};

function getPageIdFromHash() {
  const hash = window.location.hash.replace("#", "");
  if (!hash) {
    return "home";
  }

  const directPage = pages.find((page) => page.id === hash);
  if (directPage) {
    return directPage.id;
  }

  const target = document.getElementById(hash);
  const parentPage = target?.closest("[data-page]");
  return parentPage?.id || "home";
}

function setActivePage(pageId) {
  pages.forEach((page) => {
    page.classList.toggle("is-active", page.id === pageId);
  });

  mainLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.pageLink === pageId);
  });
}

function getDefaultSubpage(page) {
  return page?.querySelector(".sub-nav a")?.getAttribute("href")?.replace("#", "") || page?.id || "home";
}

function setActiveSubpage(pageId) {
  const activePage = document.getElementById(pageId);
  const hash = window.location.hash.replace("#", "");
  const target = document.getElementById(hash);
  const targetSection = target?.classList.contains("page-section") ? target : target?.closest(".page-section[id]");
  const activeSubpageId =
    targetSection?.closest("[data-page]")?.id === pageId ? targetSection.id : getDefaultSubpage(activePage);

  pageSections.forEach((section) => {
    const isInActivePage = section.closest("[data-page]")?.id === pageId;
    section.classList.toggle("is-active-subpage", isInActivePage && section.id === activeSubpageId);
  });

  return activeSubpageId;
}

function closeMobileNav() {
  siteNav.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  updateHeaderHeight();
}

function updateHeaderHeight() {
  if (!siteHeader) {
    return;
  }

  document.documentElement.style.setProperty("--header-height", `${siteHeader.offsetHeight}px`);
}

function scrollToHashTarget(activeSubpageId) {
  const activePage = document.querySelector(".page.is-active");
  const target = activePage || document.getElementById(activeSubpageId);

  if (!target) {
    return;
  }

  requestAnimationFrame(() => {
    window.scrollTo({
      top: Math.max(0, target.offsetTop - siteHeader.offsetHeight),
      behavior: "smooth"
    });
  });
}

function updateSubNavState(activeSubpageId) {
  const activePage = document.querySelector(".page.is-active");
  if (!activePage) {
    return;
  }

  const links = Array.from(activePage.querySelectorAll(".sub-nav a"));
  links.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${activeSubpageId}`);
  });
}

function routeToCurrentHash() {
  const pageId = getPageIdFromHash();
  setActivePage(pageId);
  const activeSubpageId = setActiveSubpage(pageId);
  updateSubNavState(activeSubpageId);
  loadActiveSubpage(activeSubpageId);
  scrollToHashTarget(activeSubpageId);
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateValue}T12:00:00`));
}

function renderEventList(details) {
  if (details.dataset.loaded === "true") {
    return;
  }

  const type = details.dataset.lazyList;
  const now = new Date();
  const items = events
    .filter((event) => {
      const eventDate = new Date(`${event.date}T12:00:00`);
      return type === "events-upcoming" ? eventDate >= now : eventDate < now;
    })
    .sort((a, b) => {
      const direction = type === "events-upcoming" ? 1 : -1;
      return direction * (new Date(a.date) - new Date(b.date));
    });

  const container = details.querySelector(".dynamic-list");
  container.innerHTML = items
    .map(
      (item) => `
        <article class="dynamic-card">
          <time datetime="${item.date}">${formatDate(item.date)}</time>
          <h3>${item.title}</h3>
          <p>${item.summary}</p>
        </article>
      `
    )
    .join("");
  details.dataset.loaded = "true";
}

function renderGallery(details) {
  if (details.dataset.loaded === "true") {
    return;
  }

  const collection = galleryCollections[details.dataset.lazyGallery] || [];
  const container = details.querySelector(".gallery-sections");
  container.innerHTML = collection
    .map(
      (section) => `
        <section class="gallery-section">
          <h3>${section.section}</h3>
          <div class="gallery-grid">
            ${section.photos.map((photo) => `<article class="gallery-card"><strong>${photo}</strong></article>`).join("")}
          </div>
        </section>
      `
    )
    .join("");
  details.dataset.loaded = "true";
}

function renderNews() {
  const sortedNews = [...newsItems].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestContainer = document.querySelector('[data-news-list="latest"]');
  const archiveContainer = document.querySelector('[data-news-list="archive"]');

  if (latestContainer && latestContainer.dataset.loaded !== "true") {
    const latest = sortedNews[0];
    latestContainer.innerHTML = `
      <details open>
        <summary>${latest.title}</summary>
        <article class="dynamic-list">
          <div class="dynamic-card">
            <time datetime="${latest.date}">${formatDate(latest.date)}</time>
            <p>${latest.summary}</p>
          </div>
        </article>
      </details>
    `;
    latestContainer.dataset.loaded = "true";
  }

  if (!archiveContainer || archiveContainer.dataset.loaded === "true") {
    return;
  }

  archiveContainer.innerHTML = sortedNews
    .slice(1)
    .map(
      (item) => `
        <details>
          <summary>${item.title}</summary>
          <article class="dynamic-list">
            <div class="dynamic-card">
              <time datetime="${item.date}">${formatDate(item.date)}</time>
              <p>${item.summary}</p>
            </div>
          </article>
        </details>
      `
    )
    .join("");
  archiveContainer.dataset.loaded = "true";
}

function loadActiveSubpage(activeSubpageId) {
  const activeSection = document.getElementById(activeSubpageId);
  activeSection?.querySelectorAll("[data-lazy-list]").forEach((details) => {
    if (details.open) {
      renderEventList(details);
    }
  });
  activeSection?.querySelectorAll("[data-lazy-gallery]").forEach((details) => {
    if (details.open) {
      renderGallery(details);
    }
  });

  if (activeSubpageId === "latest-news" || activeSubpageId === "news-archive") {
    renderNews();
  }
}

navToggle.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
  requestAnimationFrame(updateHeaderHeight);
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href^='#']");
  if (!(link instanceof HTMLAnchorElement)) {
    return;
  }

  const pageLink = link.dataset.pageLink;
  const defaultTarget = link.dataset.defaultTarget;
  if (pageLink && defaultTarget) {
    event.preventDefault();
    window.location.hash = defaultTarget;
  }

  closeMobileNav();
});

document.querySelectorAll("[data-lazy-list]").forEach((details) => {
  details.addEventListener("toggle", () => {
    if (details.open) {
      renderEventList(details);
    }
  });
});

document.querySelectorAll("[data-lazy-gallery]").forEach((details) => {
  details.addEventListener("toggle", () => {
    if (details.open) {
      renderGallery(details);
    }
  });
});

window.addEventListener("hashchange", routeToCurrentHash);
window.addEventListener("resize", updateHeaderHeight);

signupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(signupForm);
  const name = String(formData.get("name") || "friend").trim() || "friend";
  formNote.textContent = `Thank you, ${name}. We will keep you posted.`;
  signupForm.reset();
});

updateHeaderHeight();
routeToCurrentHash();
