const navToggle = document.querySelector(".nav-toggle");
const siteHeader = document.querySelector(".site-header");
const siteNav = document.querySelector(".site-nav");
const pages = Array.from(document.querySelectorAll("[data-page]"));
const mainLinks = Array.from(document.querySelectorAll("[data-page-link]"));
const pageSections = Array.from(document.querySelectorAll(".page-section[id]"));
const signupForm = document.querySelector(".signup-form");
const formNote = document.querySelector(".form-note");
const signupEndpoint =
  "https://script.google.com/macros/s/AKfycbwpBaYQNH2pRSkebK2lcntwi_ADO_IRxhikcmdIzi5SY7QyErBPaFa8HeC2P74rxxxu/exec";

const contentManifestPath = "content-manifest.json";
const manifestPromise = fetch(`${contentManifestPath}?v=${Date.now()}`, { cache: "no-store" })
  .then((response) => (response.ok ? response.json() : null))
  .catch(() => null);
const contentVersionPromise = manifestPromise.then((manifest) => manifest?.__generatedAt || Date.now());

const googleDriveGalleryFolderId = "1PAjJmVMmNn97xRsW4r3FSHVA__hhfIBW";
let sessionGoogleDriveApiKey = "";

const contentConfig = {
  mission: { manifestKey: "mission", folder: "contents/mission", mode: "fullAsc" },
  board: { manifestKey: "board", folder: "contents/board", mode: "board" },
  history: { manifestKey: "history", folder: "contents/history", mode: "accordionDesc" },
  musicQ: { manifestKey: "musicQ", folder: "contents/music_q", mode: "accordionDesc" },
  monthlyQna: { manifestKey: "monthlyQna", folder: "contents/monthly_qna", mode: "accordionDesc" },
  jobInterview: { manifestKey: "jobInterview", folder: "contents/job_interview", mode: "accordionDesc" },
  musicJourney: { manifestKey: "musicJourney", folder: "contents/music-journey", mode: "accordionDesc" },
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
  if (typeof window._waveRefresh === 'function') window._waveRefresh();
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

function fileUrl(folder, fileName, version = "") {
  if (/^https?:\/\//.test(fileName) || fileName.startsWith("/")) {
    return fileName;
  }
  const suffix = version ? `?v=${encodeURIComponent(version)}` : "";
  return `${folder}/${fileName}${suffix}`;
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

function formatDateTime(dateValue) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(dateValue));
}

function showNoContents(container) {
  container.innerHTML = "";
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
  const contentVersion = await contentVersionPromise;
  const responses = await Promise.all(
    files.map(async (fileName) => {
      try {
        const path = fileUrl(config.folder, fileName, contentVersion);
        const response = await fetch(path, { cache: "no-store" });
        if (!response.ok) {
          return null;
        }
        const markdown = await response.text();
        const parsed = parseMarkdown(markdown, titleFromFileName(fileName));
        return { fileName, path, ...parsed, dateInfo: parseDateFromFileName(fileName) };
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
  container.innerHTML = items.length ? items.map(renderMarkdownArticle).join("") : "";
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
    : "";
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
        : "";

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
    : "";

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
    list.innerHTML = "";
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

function getGoogleDriveApiKey() {
  if (sessionGoogleDriveApiKey) {
    return sessionGoogleDriveApiKey;
  }

  const configuredKey = window.MUSIC_ANGELS_GOOGLE_API_KEY;
  if (typeof configuredKey === "string" && configuredKey.trim()) {
    sessionGoogleDriveApiKey = configuredKey.trim();
    return sessionGoogleDriveApiKey;
  }

  return "";
}

function requestGoogleDriveApiKey() {
  const apiKey = window.prompt("Google Drive API key");
  if (!apiKey?.trim()) {
    return "";
  }

  sessionGoogleDriveApiKey = apiKey.trim();
  return sessionGoogleDriveApiKey;
}

function buildDriveApiUrl(params) {
  const apiKey = getGoogleDriveApiKey();
  if (!apiKey) {
    return "";
  }

  const url = new URL("https://www.googleapis.com/drive/v3/files");
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  url.searchParams.set("key", apiKey);
  return url.toString();
}

async function listDriveFiles(folderId, options = {}) {
  const files = [];
  let pageToken = "";
  const q = [`'${folderId}' in parents`, "trashed = false"];
  if (options.mimePrefix) {
    q.push(`mimeType contains '${options.mimePrefix}'`);
  }
  if (options.mimeType) {
    q.push(`mimeType = '${options.mimeType}'`);
  }

  do {
    const url = buildDriveApiUrl({
      q: q.join(" and "),
      orderBy: options.orderBy || "createdTime desc",
      pageSize: "100",
      pageToken,
      fields:
        "nextPageToken,files(id,name,mimeType,createdTime,thumbnailLink,webContentLink,webViewLink,imageMediaMetadata(width,height),videoMediaMetadata(width,height,durationMillis))"
    });

    if (!url) {
      throw new Error("missing-api-key");
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("drive-request-failed");
    }
    const data = await response.json();
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return files;
}

function isGalleryMedia(file) {
  return file.mimeType?.startsWith("image/") || file.mimeType?.startsWith("video/");
}

function mediaPreviewUrl(file) {
  if (file.thumbnailLink) {
    return file.thumbnailLink.replace(/=s\d+$/, "=s640");
  }

  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(file.id)}&sz=w640`;
}

function imageViewUrl(file) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(file.id)}&sz=w1600`;
}

function videoEmbedUrl(file) {
  return `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/preview`;
}

function mediaKind(file) {
  return file.mimeType?.startsWith("video/") ? "Video" : "Photo";
}

async function renderGoogleGallery(container) {
  if (container.dataset.loaded === "true" || container.dataset.loading === "true") {
    return;
  }

  if (!getGoogleDriveApiKey()) {
    container.innerHTML = `
      <div class="gallery-config">
        <button class="button button-primary" type="button" data-gallery-key-button>Load Gallery</button>
      </div>
    `;
    container.querySelector("[data-gallery-key-button]")?.addEventListener("click", () => {
      if (requestGoogleDriveApiKey()) {
        delete container.dataset.loaded;
        renderGoogleGallery(container);
      }
    });
    container.dataset.loaded = "true";
    return;
  }

  container.dataset.loading = "true";
  container.innerHTML = '<p class="empty-state">Loading...</p>';

  try {
    const folders = await listDriveFiles(googleDriveGalleryFolderId, {
      mimeType: "application/vnd.google-apps.folder",
      orderBy: "createdTime desc"
    });

    if (!folders.length) {
      showNoContents(container);
      return;
    }

    container.innerHTML = folders
      .map(
        (folder, index) => `
          <details class="gallery-folder" data-gallery-folder-id="${escapeHtml(folder.id)}" data-gallery-folder-index="${index}">
            <summary>
              <span>${escapeHtml(folder.name)}</span>
            </summary>
            <div class="gallery-grid" aria-live="polite"></div>
          </details>
        `
      )
      .join("");

    container.querySelectorAll(".gallery-folder").forEach((details) => {
      details.addEventListener("toggle", () => {
        if (details.open) {
          renderGalleryFolder(details);
        }
      });
    });
    container.dataset.loaded = "true";
  } catch {
    showNoContents(container);
  } finally {
    delete container.dataset.loading;
  }
}

async function renderGalleryFolder(details) {
  if (details.dataset.loaded === "true" || details.dataset.loading === "true") {
    return;
  }

  const folderId = details.dataset.galleryFolderId;
  const grid = details.querySelector(".gallery-grid");
  details.dataset.loading = "true";
  grid.innerHTML = '<p class="empty-state">Loading...</p>';

  try {
    const files = (await listDriveFiles(folderId, { orderBy: "createdTime desc" })).filter(isGalleryMedia);
    if (!files.length) {
      grid.innerHTML = "";
      details.dataset.loaded = "true";
      return;
    }

    grid.innerHTML = files
      .map(
        (file, index) => `
          <button class="gallery-card" type="button" data-gallery-media-index="${index}">
            <img src="${escapeHtml(mediaPreviewUrl(file))}" alt="" loading="lazy" />
            <span class="gallery-card-meta">
              <strong>${escapeHtml(file.name)}</strong>
              <small>${mediaKind(file)}</small>
            </span>
          </button>
        `
      )
      .join("");

    grid.querySelectorAll("[data-gallery-media-index]").forEach((button) => {
      button.addEventListener("click", () => {
        openGalleryDialog(files, Number(button.dataset.galleryMediaIndex));
      });
    });
    details.dataset.loaded = "true";
  } catch {
    grid.innerHTML = "";
  } finally {
    delete details.dataset.loading;
  }
}

function openGalleryDialog(files, startIndex) {
  let currentIndex = startIndex;
  const dialog = document.createElement("dialog");
  dialog.className = "gallery-dialog";
  dialog.innerHTML = `
    <div class="gallery-dialog-panel">
      <div class="gallery-dialog-toolbar">
        <button class="dialog-close" type="button" aria-label="Close">Close</button>
      </div>
      <div class="gallery-stage"></div>
      <div class="gallery-dialog-footer">
        <button class="gallery-nav-button" type="button" data-gallery-prev aria-label="Previous">Prev</button>
        <div>
          <strong data-gallery-title></strong>
          <small data-gallery-count></small>
        </div>
        <button class="gallery-nav-button" type="button" data-gallery-next aria-label="Next">Next</button>
      </div>
    </div>
  `;

  const stage = dialog.querySelector(".gallery-stage");
  const title = dialog.querySelector("[data-gallery-title]");
  const count = dialog.querySelector("[data-gallery-count]");
  const prev = dialog.querySelector("[data-gallery-prev]");
  const next = dialog.querySelector("[data-gallery-next]");

  function renderCurrent() {
    const file = files[currentIndex];
    title.textContent = file.name;
    count.textContent = `${currentIndex + 1} / ${files.length}`;
    if (file.mimeType?.startsWith("video/")) {
      stage.innerHTML = `<iframe src="${escapeHtml(videoEmbedUrl(file))}" title="${escapeHtml(file.name)}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    } else {
      stage.innerHTML = `<img src="${escapeHtml(imageViewUrl(file))}" alt="${escapeHtml(file.name)}" />`;
    }
  }

  function move(direction) {
    currentIndex = (currentIndex + direction + files.length) % files.length;
    renderCurrent();
  }

  prev.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      move(-1);
    } else if (event.key === "ArrowRight") {
      move(1);
    }
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
  dialog.addEventListener("close", () => dialog.remove());

  document.body.append(dialog);
  renderCurrent();
  dialog.showModal();
}

function loadActiveSubpage(activeSubpageId) {
  const activeSection = document.getElementById(activeSubpageId);
  activeSection?.querySelectorAll("[data-content-page]").forEach((container) => {
    if (container.tagName.toLowerCase() !== "details" || container.open) {
      renderContentContainer(container);
    }
  });
  activeSection?.querySelectorAll("[data-google-gallery]").forEach((container) => {
    renderGoogleGallery(container);
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

window.addEventListener("hashchange", routeToCurrentHash);
window.addEventListener("resize", updateHeaderHeight);

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(signupForm);
  const submitButton = signupForm.querySelector('button[type="submit"]');
  const payload = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    message: String(formData.get("message") || "").trim()
  };

  submitButton.disabled = true;
  formNote.textContent = "Sending...";

  try {
    await fetch(signupEndpoint, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    formNote.textContent = `Thank you${payload.name ? `, ${payload.name}` : ""}. We will keep you posted.`;
    signupForm.reset();
  } catch {
    formNote.textContent = "We could not send your message. Please try again.";
  } finally {
    submitButton.disabled = false;
  }
});

updateHeaderHeight();
routeToCurrentHash();


/* ============================================
   BOLD ANIMATION ENHANCEMENTS
   ============================================ */

// -- Scroll progress bar ---------------------
(function () {
  const bar = document.createElement('div');
  bar.id = 'scroll-progress';
  document.body.prepend(bar);

  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = total > 0 ? `${(window.scrollY / total) * 100}%` : '0%';
  }, { passive: true });
})();

// -- Ripple helper ---------------------------
function addRipple(el, event, cls = 'btn-ripple') {
  const rect = el.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = cls;
  const size = Math.max(rect.width, rect.height) * 1.6;
  ripple.style.cssText = `
    width:${size}px; height:${size}px;
    left:${event.clientX - rect.left - size / 2}px;
    top:${event.clientY - rect.top - size / 2}px;
  `;
  el.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

// -- Button ripple ---------------------------
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.button');
  if (btn) addRipple(btn, e, 'btn-ripple');
});

// -- Nav ripple ------------------------------
document.addEventListener('click', (e) => {
  const link = e.target.closest('.site-nav a');
  if (link) addRipple(link, e, 'nav-ripple');
});

// -- Scroll reveal ---------------------------
(function () {
  const revealEls = [
    '.section-inner > h2',
    '.section-inner > p',
    '.section-heading',
    '.markdown-article',
    '.simple-card',
    '.accordion-list > details',
    '.timeline article',
    '.title-button',
    '.signup-form',
    '.contact-panel > *',
  ];

  function markRevealTargets() {
    revealEls.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el, i) => {
        if (!el.classList.contains('reveal')) {
          el.classList.add('reveal');
          // stagger siblings
          const siblings = Array.from(el.parentElement.children).filter(c =>
            c.classList.contains('reveal') && !c.classList.contains('is-visible')
          );
          const idx = siblings.indexOf(el);
          if (idx > 0 && idx <= 4) {
            el.classList.add(`reveal-delay-${idx}`);
          }
        }
      });
    });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  function observeAll() {
    document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => observer.observe(el));
  }

  // Re-run after each page/subpage switch
  const origSetActivePage = window._origSetActivePage || setActivePage;
  window._origSetActivePage = origSetActivePage;

  function refreshReveal() {
    markRevealTargets();
    // Small delay so display:block kicks in first
    setTimeout(observeAll, 60);
  }

  // Hook into hashchange
  window.addEventListener('hashchange', refreshReveal);

  // Initial run
  markRevealTargets();
  setTimeout(observeAll, 120);

  // Also observe dynamically added content
  const mutObs = new MutationObserver(() => {
    markRevealTargets();
    observeAll();
  });
  mutObs.observe(document.querySelector('main'), { childList: true, subtree: true });
})();

// -- Accordion: smooth height animation ------
(function () {
  // We rely on CSS animation for the content block appearance,
  // but add a class to <details> for the summary indent cue.
  document.addEventListener('toggle', (e) => {
    const details = e.target.closest('details');
    if (!details) return;
    if (details.open) {
      details.classList.add('just-opened');
      setTimeout(() => details.classList.remove('just-opened'), 400);
    }
  }, true);
})();

// -- sub-nav active pulse on click -----------
document.addEventListener('click', (e) => {
  const link = e.target.closest('.sub-nav a');
  if (!link) return;
  // Re-trigger animation
  link.style.animation = 'none';
  requestAnimationFrame(() => {
    link.style.animation = '';
  });
});


/* ============================================
   PAGE-HERO WAVE CANVAS ANIMATION
   ============================================ */
(function () {
  // Wave colour sets per hero background type
  const WAVE_THEMES = {
    'section-white': [
      { color: 'rgba(45,122,110,0.55)',  speed: 0.012, amp: 28, freq: 0.018, offset: 0     },
      { color: 'rgba(45,122,110,0.35)',  speed: 0.018, amp: 20, freq: 0.025, offset: 2.1   },
      { color: 'rgba(201,151,58,0.28)',  speed: 0.009, amp: 36, freq: 0.013, offset: 4.4   },
      { color: 'rgba(45,122,110,0.18)',  speed: 0.022, amp: 14, freq: 0.032, offset: 1.0   },
    ],
    'section-mint': [
      { color: 'rgba(45,122,110,0.60)',  speed: 0.013, amp: 30, freq: 0.016, offset: 0     },
      { color: 'rgba(45,122,110,0.38)',  speed: 0.020, amp: 22, freq: 0.022, offset: 1.8   },
      { color: 'rgba(201,151,58,0.30)',  speed: 0.010, amp: 40, freq: 0.012, offset: 3.6   },
      { color: 'rgba(224,92,69,0.18)',   speed: 0.016, amp: 16, freq: 0.028, offset: 5.2   },
    ],
    'section-ink': [
      { color: 'rgba(245,200,66,0.45)',  speed: 0.010, amp: 32, freq: 0.015, offset: 0     },
      { color: 'rgba(245,200,66,0.28)',  speed: 0.017, amp: 24, freq: 0.021, offset: 2.6   },
      { color: 'rgba(58,148,133,0.38)',  speed: 0.008, amp: 42, freq: 0.011, offset: 4.0   },
      { color: 'rgba(245,200,66,0.18)',  speed: 0.023, amp: 15, freq: 0.030, offset: 0.8   },
    ],
  };

  const DEFAULT_THEME = WAVE_THEMES['section-white'];

  // Per-canvas animation state
  const canvasStates = new WeakMap();

  function getTheme(heroEl) {
    for (const [cls, waves] of Object.entries(WAVE_THEMES)) {
      if (heroEl.classList.contains(cls)) return waves;
    }
    return DEFAULT_THEME;
  }

  function drawWave(ctx, wave, t, width, height) {
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 3) {
      // multi-harmonic: primary + 2nd harmonic for richness
      const y = height * 0.52
        + Math.sin(x * wave.freq + t * wave.speed + wave.offset) * wave.amp
        + Math.sin(x * wave.freq * 2.1 + t * wave.speed * 1.6 + wave.offset + 1.2) * (wave.amp * 0.38)
        + Math.sin(x * wave.freq * 0.45 + t * wave.speed * 0.7 + wave.offset + 2.8) * (wave.amp * 0.55);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = wave.color;
    ctx.fill();
  }

  function tick(canvas) {
    const state = canvasStates.get(canvas);
    if (!state || !state.active) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    state.t += 1;
    state.waves.forEach(wave => drawWave(ctx, wave, state.t, width, height));

    state.raf = requestAnimationFrame(() => tick(canvas));
  }

  function resizeCanvas(canvas) {
    const hero = canvas.closest('.page-hero');
    if (!hero) return;
    // offsetWidth/Height work even right after display:block,
    // unlike getBoundingClientRect which can return 0 mid-transition
    const w = hero.offsetWidth  || hero.parentElement?.offsetWidth  || window.innerWidth;
    const h = hero.offsetHeight || hero.parentElement?.offsetHeight || 300;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }

  function initCanvas(heroEl) {
    // Don't double-init
    if (heroEl.querySelector('.wave-canvas')) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'wave-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    heroEl.insertBefore(canvas, heroEl.firstChild);

    const state = {
      t: Math.random() * 1000, // randomise phase per page
      active: true,
      waves: getTheme(heroEl),
      raf: null,
    };
    canvasStates.set(canvas, state);

    resizeCanvas(canvas);
    tick(canvas);

    return canvas;
  }

  function stopCanvas(canvas) {
    const state = canvasStates.get(canvas);
    if (!state) return;
    state.active = false;
    if (state.raf) cancelAnimationFrame(state.raf);
  }

  function startCanvas(canvas) {
    const state = canvasStates.get(canvas);
    if (!state) return;
    if (state.active) return; // already running
    state.active = true;
    tick(canvas);
  }

  // Init canvases for all visible page-heroes on page switch
  function refreshWaves() {
    // Stop all first
    document.querySelectorAll('.wave-canvas').forEach(stopCanvas);

    // Double rAF: first frame lets display:block apply,
    // second frame lets the browser measure layout correctly
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const activePage = document.querySelector('.page.is-active');
        if (!activePage) return;

        activePage.querySelectorAll('.page-hero').forEach(hero => {
          const existing = hero.querySelector('.wave-canvas');
          if (existing) {
            resizeCanvas(existing);
            startCanvas(existing);
          } else {
            initCanvas(hero);
          }
        });
      });
    });
  }

  // Expose for routeToCurrentHash
  window._waveRefresh = refreshWaves;

  // Resize handler
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      document.querySelectorAll('.page.is-active .wave-canvas').forEach(resizeCanvas);
    }, 150);
  }, { passive: true });

  // Initial load
  // Initial call handled by routeToCurrentHash() at page load
})();
