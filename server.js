import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { google } from "googleapis";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// =========================
// ENV VARIABLES (Render)
// =========================
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

if (!SPREADSHEET_ID) {
  console.error("❌ Missing GOOGLE_SHEET_ID");
}

const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: privateKey,
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// =========================
// SECURITY CHECK - TOKEN
// =========================
function validateToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "").trim();

  if (token !== process.env.LOG_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

// =========================
// WRITE CALL LOG (POST)
// =========================
app.post("/log-call", validateToken, async (req, res) => {
  try {
    const body = req.body;

    const row = [
      body.id || Date.now(),
      body.phone || "",
      body.name || "",
      body.city || "",
      body.firstTime || "",
      body.time || new Date().toISOString(),
      body.callType || "",
      body.purpose || "",
      body.result || "",
      body.notes || "",
      body.priority || "",
      body.duration || "",
      body.recordingUrl || "",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "CallLog!A:Z",
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error writing to sheet:", err);
    res.status(500).json({ success: false, error: err.toString() });
  }
});

// =========================
// READ CALL LOGS (GET)
// =========================
app.get("/logs", async (req, res) => {
  try {
    const { page = 1, search = "", sort = "", priority = "", callType = "" } = req.query;

    const range = "CallLog!A:Z";

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });

    const rows = result.data.values || [];
    const headers = rows.shift() || [];

    // Convert rows to objects
    let data = rows.map((r) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = r[i] || ""));
      return obj;
    });

    // ---- SEARCH ----
    const s = search.toLowerCase();
    if (s) {
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.phone.toLowerCase().includes(s) ||
          r.city.toLowerCase().includes(s)
      );
    }

    // ---- FILTERS ----
    if (priority) data = data.filter((r) => r.priority === priority);
    if (callType) data = data.filter((r) => r.callType === callType);

    // ---- SORT ----
    if (sort === "date_desc") data.sort((a, b) => new Date(b.time) - new Date(a.time));
    if (sort === "date_asc") data.sort((a, b) => new Date(a.time) - new Date(b.time));

    // ---- PAGINATION ----
    const pageSize = 20;
    const start = (page - 1) * pageSize;
    const paged = data.slice(start, start + pageSize);

    res.json({
      page,
      total: data.length,
      data: paged,
    });
  } catch (err) {
    console.error("❌ Error loading logs:", err);
    res.status(500).json({ error: err.toString() });
  }
});

// =========================
// ROOT CHECK
// =========================
app.get("/", (req, res) => {
  res.send("Call logger is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🔥 Server running on port", PORT));
