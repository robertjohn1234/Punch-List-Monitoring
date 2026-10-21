const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "punchlist-data.json");
const HISTORY_FILE = path.join(__dirname, "punchlist-history.json");

// Chart.js for the browser at /vendor/chart.umd.js
app.use("/vendor", express.static(path.join(__dirname, "node_modules", "chart.js", "dist")));
app.use(express.static(path.join(__dirname, "public")));

// Render uses this to check the server is alive
app.get("/health", (req, res) => res.status(200).send("ok"));

function sendJsonFile(res, file) {
  const name = path.basename(file);
  try {
    res.set("Cache-Control", "no-cache").type("application/json").send(fs.readFileSync(file, "utf8"));
  } catch (error) {
    const missing = error.code === "ENOENT";
    res.status(missing ? 503 : 500).json({
      error: missing ? `${name} not found. Run update-dashboard.bat and commit the file.` : `Unable to read ${name}`
    });
  }
}

app.get("/api/punchlist", (req, res) => sendJsonFile(res, DATA_FILE));
app.get("/api/history", (req, res) => sendJsonFile(res, HISTORY_FILE));

app.listen(PORT, "0.0.0.0", () => console.log(`Punch list dashboard running on port ${PORT}`));
