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

// Load private key correctly
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
  res.send("Call logger is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
