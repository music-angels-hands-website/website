const navToggle = document.querySelector(".nav-toggle");
const siteHeader = document.querySelector(".site-header");
const siteNav = document.querySelector(".site-nav");
const pages = Array.from(document.querySelectorAll("[data-page]"));
const mainLinks = Array.from(document.querySelectorAll("[data-page-link]"));
const pageSections = Array.from(document.querySelectorAll(".page-section[id]"));
const signupForm = document.querySelector(".signup-form");
const formNote = document.querySelector(".form-note");

const contentManifestPath = "content-manifest.json";
const manifestPromise = fetch(contentManifestPath)
  .then((response) => (response.ok ? response.json() : null))
  .catch(() => null);

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

const contentConfig = {
  mission: { manifestKey: "mission", folder: "contents/mission", mode: "fullAsc" },
  board: { manifestKey: "board", folder: "contents/board", mode: "board" },
  history: { manifestKey: "history", folder: "contents/history", mode: "accordionDesc" },
  musicJourney: { manifestKey: "musicJourney", folder: "contents/music-journey", mode: "accordionDesc" },
  musicAndBeyond: { manifestKey: "musicAndBeyond", folder: "contents/music-and-beyond", mode: "accordionDesc" },
  musicBiz: { manifestKey: "musicBiz", folder: "contents/music-biz", mode: "accordionDesc" },
  caringAngels: { manifestKey: "caringAngels", folder: "contents/caring-angels", mode: "accordionDesc" },
  eventUpcoming: { manifestKey: "event", folder: "contents/event", mode: "eventUpcoming" },
  eventPast: { manifestKey: "event", folder: "contents/event", mode: "eventPast" },
  newsLatest: { manifestKey: "news", folder: "contents/news", mode: "newsLatest" },
  newsArchive: { manifestKey: "news", folder: "contents/news", mode: "newsArchive" }
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function titleFromFileName(fileName) {
  return getFileName(fileName)
    .replace(/\.md$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/^\d+\s*/, "")
    .trim() || "Untitled";
}

function parseMarkdown(markdown, fallbackTitle = "Untitled") {
  const normalized = String(markdown || "").replace(/\r\n?/g, "\n").trim();
  const lines = normalized.split("\n");
  const titleIndex = lines.findIndex((line) => /^#{1,2}\s+/.test(line.trim()));
  const title = titleIndex >= 0 ? lines[titleIndex].replace(/^#{1,2}\s+/, "").trim() : fallbackTitle;
  const bodyLines = titleIndex >= 0 ? lines.slice(titleIndex + 1) : lines;
  const blocks = [];
  let paragraph = [];
  let listItems = [];

  function flushParagraph() {
    if (!paragraph.length) {
      return;
    }
    blocks.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!listItems.length) {
      return;
    }
    blocks.push(`<ul>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
    listItems = [];
  }

  bodyLines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(6, Math.max(3, heading[1].length + 1));
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      return;
    }

    const listItem = trimmed.match(/^[-*]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      listItems.push(listItem[1]);
      return;
    }

    flushList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();

  return { title, body: blocks.join("") };
}

function getFileName(path) {
  return String(path || "").split("/").pop() || "";
}

function fileUrl(folder, fileName) {
  if (/^https?:\/\//.test(fileName) || fileName.startsWith("/")) {
    return fileName;
  }
  return `${folder}/${fileName}`;
}

function sortByNameAsc(items) {
  return [...items].sort((a, b) => getFileName(a).localeCompare(getFileName(b), "en", { numeric: true }));
}

function sortByNameDesc(items) {
  return sortByNameAsc(items).reverse();
}

function parseDateFromFileName(fileName) {
  const name = getFileName(fileName);
  const digits = name.match(/\d{8}/)?.[0];
  if (!digits) {
    return null;
  }

  const maybeYearFirst = Number(digits.slice(0, 4));
  const iso =
    maybeYearFirst >= 1900
      ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
      : `${digits.slice(4, 8)}-${digits.slice(0, 2)}-${digits.slice(2, 4)}`;
  const date = new Date(`${iso}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : { iso, date };
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateValue}T12:00:00`));
}

function showNoContents(container) {
  container.innerHTML = '<p class="empty-state">No Contents</p>';
  container.dataset.loaded = "true";
}

async function getManifestFiles(config) {
  const manifest = await manifestPromise;
  const value = manifest?.[config.manifestKey];
  if (config.mode === "board") {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  return Array.isArray(value) ? value : [];
}

async function fetchMarkdownItems(config, files) {
  const responses = await Promise.all(
    files.map(async (fileName) => {
      try {
        const response = await fetch(fileUrl(config.folder, fileName));
        if (!response.ok) {
          return null;
        }
        const markdown = await response.text();
        const parsed = parseMarkdown(markdown, titleFromFileName(fileName));
        return { fileName, path: fileUrl(config.folder, fileName), ...parsed, dateInfo: parseDateFromFileName(fileName) };
      } catch {
        return null;
      }
    })
  );
  return responses.filter(Boolean);
}

function renderMarkdownArticle(item) {
  return `
    <article class="markdown-article">
      <h2>${escapeHtml(item.title)}</h2>
      <div class="markdown-body">${item.body}</div>
    </article>
  `;
}

async function renderFullAsc(container, config) {
  const files = sortByNameAsc(await getManifestFiles(config));
  if (!files.length) {
    showNoContents(container);
    return;
  }

  const items = await fetchMarkdownItems(config, files);
  container.innerHTML = items.length ? items.map(renderMarkdownArticle).join("") : '<p class="empty-state">No Contents</p>';
  container.dataset.loaded = "true";
}

async function renderAccordionDesc(container, config) {
  const files = sortByNameDesc(await getManifestFiles(config));
  if (!files.length) {
    showNoContents(container);
    return;
  }

  const items = await fetchMarkdownItems(config, files);
  container.innerHTML = items.length
    ? items
        .map(
          (item, index) => `
            <details ${index === 0 ? "open" : ""}>
              <summary>${escapeHtml(item.title)}</summary>
              <article class="markdown-body">${item.body}</article>
            </details>
          `
        )
        .join("")
    : '<p class="empty-state">No Contents</p>';
  container.dataset.loaded = "true";
}

async function renderBoard(container, config) {
  const years = await getManifestFiles(config);
  const sortedYears = Object.keys(years).sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
  if (!sortedYears.length) {
    showNoContents(container);
    return;
  }

  const sections = await Promise.all(
    sortedYears.map(async (year, index) => {
      const files = sortByNameAsc(Array.isArray(years[year]) ? years[year] : []);
      const items = await fetchMarkdownItems({ ...config, folder: `${config.folder}/${year}` }, files);
      const cards = items.length
        ? items
            .map(
              (item) => `
                <article class="dynamic-card markdown-card">
                  <h3>${escapeHtml(item.title)}</h3>
                  <div class="markdown-body">${item.body}</div>
                </article>
              `
            )
            .join("")
        : '<p class="empty-state">No Contents</p>';

      return `
        <details ${index === 0 ? "open" : ""}>
          <summary>${escapeHtml(year)}</summary>
          <div class="people-grid">${cards}</div>
        </details>
      `;
    })
  );

  container.innerHTML = sections.join("");
  container.dataset.loaded = "true";
}

function sortByDateDesc(files) {
  return [...files].sort((a, b) => {
    const dateA = parseDateFromFileName(a)?.date?.getTime() || 0;
    const dateB = parseDateFromFileName(b)?.date?.getTime() || 0;
    return dateB - dateA || getFileName(b).localeCompare(getFileName(a), "en", { numeric: true });
  });
}

function sortEvents(files, upcoming) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return [...files]
    .filter((fileName) => {
      const date = parseDateFromFileName(fileName)?.date;
      if (!date) {
        return false;
      }
      return upcoming ? date >= today : date < today;
    })
    .sort((a, b) => {
      const dateA = parseDateFromFileName(a).date.getTime();
      const dateB = parseDateFromFileName(b).date.getTime();
      return upcoming ? dateA - dateB : dateB - dateA;
    });
}

function openContentDialog(item) {
  const dialog = document.createElement("dialog");
  dialog.className = "content-dialog";
  dialog.innerHTML = `
    <div class="dialog-panel">
      <button class="dialog-close" type="button" aria-label="Close">Close</button>
      ${item.dateInfo ? `<time datetime="${item.dateInfo.iso}">${formatDate(item.dateInfo.iso)}</time>` : ""}
      <h2>${escapeHtml(item.title)}</h2>
      <article class="markdown-body">${item.body}</article>
    </div>
  `;
  document.body.append(dialog);
  dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
  dialog.addEventListener("close", () => dialog.remove());
  dialog.showModal();
}

function renderTitleButtons(container, items) {
  container.innerHTML = items.length
    ? items
        .map(
          (item, index) => `
            <button class="title-button" type="button" data-dialog-index="${index}">
              ${item.dateInfo ? `<time datetime="${item.dateInfo.iso}">${formatDate(item.dateInfo.iso)}</time>` : ""}
              <span>${escapeHtml(item.title)}</span>
            </button>
          `
        )
        .join("")
    : '<p class="empty-state">No Contents</p>';

  container.querySelectorAll("[data-dialog-index]").forEach((button) => {
    button.addEventListener("click", () => {
      openContentDialog(items[Number(button.dataset.dialogIndex)]);
    });
  });
}

async function renderEventTitles(container, config, upcoming) {
  const files = sortEvents(await getManifestFiles(config), upcoming);
  if (!files.length) {
    showNoContents(container);
    return;
  }

  const items = await fetchMarkdownItems(config, files);
  renderTitleButtons(container, items);
  container.dataset.loaded = "true";
}

async function renderNewsLatest(container, config) {
  const files = sortByDateDesc(await getManifestFiles(config)).slice(0, 10);
  if (!files.length) {
    showNoContents(container);
    return;
  }

  const items = await fetchMarkdownItems(config, files);
  const wrapper = document.createElement("div");
  wrapper.className = "title-list";
  container.replaceChildren(wrapper);
  renderTitleButtons(wrapper, items);
  container.dataset.loaded = "true";
}

async function renderNewsArchive(container, config) {
  const files = sortByDateDesc(await getManifestFiles(config)).slice(10);
  const details = document.createElement("details");
  details.innerHTML = '<summary>Archive</summary><div class="title-list" aria-live="polite"></div>';
  container.replaceChildren(details);

  const list = details.querySelector(".title-list");
  if (!files.length) {
    list.innerHTML = '<p class="empty-state">No Contents</p>';
    container.dataset.loaded = "true";
    return;
  }

  const loadArchive = async () => {
    if (details.dataset.loaded === "true") {
      return;
    }
    const items = await fetchMarkdownItems(config, files);
    renderTitleButtons(list, items);
    details.dataset.loaded = "true";
  };

  details.addEventListener("toggle", () => {
    if (details.open) {
      loadArchive();
    }
  });
  container.dataset.loaded = "true";
}

async function renderContentContainer(container) {
  if (container.dataset.loaded === "true" || container.dataset.loading === "true") {
    return;
  }

  const key = container.dataset.contentPage;
  const config = contentConfig[key];
  if (!config) {
    return;
  }

  container.dataset.loading = "true";
  const loadingTarget = container.matches("details") ? container.querySelector(".title-list") : container;
  if (loadingTarget) {
    loadingTarget.innerHTML = '<p class="empty-state">Loading...</p>';
  }

  try {
    if (config.mode === "fullAsc") {
      await renderFullAsc(container, config);
    } else if (config.mode === "board") {
      await renderBoard(container, config);
    } else if (config.mode === "accordionDesc") {
      await renderAccordionDesc(container, config);
    } else if (config.mode === "eventUpcoming") {
      await renderEventTitles(container.querySelector(".title-list") || container, config, true);
    } else if (config.mode === "eventPast") {
      await renderEventTitles(container.querySelector(".title-list") || container, config, false);
    } else if (config.mode === "newsLatest") {
      await renderNewsLatest(container, config);
    } else if (config.mode === "newsArchive") {
      await renderNewsArchive(container, config);
    }
    container.dataset.loaded = "true";
  } catch {
    showNoContents(loadingTarget || container);
  } finally {
    delete container.dataset.loading;
  }
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

function loadActiveSubpage(activeSubpageId) {
  const activeSection = document.getElementById(activeSubpageId);
  activeSection?.querySelectorAll("[data-content-page]").forEach((container) => {
    if (container.tagName.toLowerCase() !== "details" || container.open) {
      renderContentContainer(container);
    }
  });
  activeSection?.querySelectorAll("[data-lazy-gallery]").forEach((details) => {
    if (details.open) {
      renderGallery(details);
    }
  });
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

document.querySelectorAll("details[data-content-page]").forEach((details) => {
  details.addEventListener("toggle", () => {
    if (details.open) {
      renderContentContainer(details);
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
