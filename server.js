import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { google } from "googleapis";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// =========================
// GOOGLE SHEETS CONNECTION
// =========================

// Spreadsheet ID from Google Sheets URL:
const SPREADSHEET_ID = "YOUR_SHEET_ID_HERE";   // <-- replace this

// Authorized Google service account
const auth = new google.auth.GoogleAuth({
  keyFile: "service-account.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const sheets = google.sheets({ version: "v4", auth });

// =========================
// WRITE CALL LOG
// =========================

app.post("/log-call", async (req, res) => {
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
      body.recordingUrl || ""
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "CallLog!A:Z",
      valueInputOption: "RAW",
      requestBody: { values: [row] }
    });

    res.json({ success: true });

  } catch (err) {
    console.error("Error writing to sheet:", err);
    res.json({ success: false, error: err.toString() });
  }
});

// =========================

app.get("/", (req, res) => {
  res.send("Call logger is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
