const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contentsRoot = path.join(root, "contents");

const folders = {
  mission: "mission",
  history: "history",
  musicQ: "music_q",
  monthlyQna: "monthly_qna",
  jobInterview: "job_interview",
  musicJourney: "music-journey",
  event: "event",
  news: "news"
};

function markdownFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

const manifest = Object.fromEntries(
  Object.entries(folders).map(([key, folder]) => [key, markdownFiles(path.join(contentsRoot, folder))])
);

const boardRoot = path.join(contentsRoot, "board");
manifest.board = {};

if (fs.existsSync(boardRoot)) {
  fs.readdirSync(boardRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a, "en", { numeric: true }))
    .forEach((year) => {
      manifest.board[year] = markdownFiles(path.join(boardRoot, year));
    });
}

fs.writeFileSync(path.join(root, "content-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
