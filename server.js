import express from "express";
import { google } from "googleapis";

const app = express();
app.use(express.json());

// Load credentials & spreadsheet ID from environment variables
const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const SPREADSHEET_ID = process.env.SHEET_ID;

// authenticate
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

app.post("/call", async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const row = [
      req.body.id || "",
      req.body.phone || "",
      req.body.name || "",
      req.body.city || "",
      req.body.firstTime || "",
      req.body.time || "",
      req.body.callType || "",
      req.body.purpose || "",
      req.body.result || "",
      req.body.notes || "",
      req.body.priority || "",
      req.body.duration || "",
      req.body.recordingUrl || ""
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "CallLog!A:Z",
      valueInputOption: "RAW",
      requestBody: { values: [row] }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ success: false, error: err.toString() });
  }
});

app.get("/", (req, res) => {
  res.send("Call Logger API active!");
});

// GET all call logs (or filter by search term)
app.get("/calls", async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });
    const { search, page = 1, limit = 20, sort, priority, callType } = req.query;

    // Get all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "CallLog!A:Z"
    });

    const rows = response.data.values || [];
    
    // Skip header row if exists
    const dataRows = rows.length > 0 && rows[0][0] === "id" ? rows.slice(1) : rows;

    // Transform rows into objects
    let calls = dataRows.map((row, index) => ({
      id: row[0] || `call_${index}`,
      phone: row[1] || "",
      name: row[2] || "",
      city: row[3] || "",
      firstTime: row[4] || "",
      time: row[5] || "",
      callType: row[6] || "",
      purpose: row[7] || "",
      result: row[8] || "",
      notes: row[9] || "",
      priority: row[10] || "",
      duration: row[11] || "",
      recordingUrl: row[12] || ""
    }));

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      calls = calls.filter(call => 
        (call.phone && call.phone.toLowerCase().includes(searchLower)) ||
        (call.name && call.name.toLowerCase().includes(searchLower)) ||
        (call.city && call.city.toLowerCase().includes(searchLower))
      );
    }

    // Apply priority filter
    if (priority) {
      calls = calls.filter(call => call.priority === priority);
    }

    // Apply call type filter
    if (callType) {
      calls = calls.filter(call => call.callType === callType);
    }

    // Apply sorting
    if (sort) {
      if (sort === "date_desc") {
        calls.reverse(); // Assuming newest are at the end
      } else if (sort === "date_asc") {
        // Keep original order
      } else if (sort === "priority_desc") {
        const priorityOrder = { "Urgent": 1, "Time-Sensitive": 2, "Standard": 3, "Low Priority": 4, "N/A": 5 };
        calls.sort((a, b) => (priorityOrder[a.priority] || 6) - (priorityOrder[b.priority] || 6));
      } else if (sort === "priority_asc") {
        const priorityOrder = { "Urgent": 1, "Time-Sensitive": 2, "Standard": 3, "Low Priority": 4, "N/A": 5 };
        calls.sort((a, b) => (priorityOrder[b.priority] || 6) - (priorityOrder[a.priority] || 6));
      }
    }

    // Pagination
    const total = calls.length;
    const pageSize = parseInt(limit);
    const pageNum = parseInt(page);
    const start = (pageNum - 1) * pageSize;
    const paginatedCalls = calls.slice(start, start + pageSize);

    res.json({
      success: true,
      data: paginatedCalls,
      total: total,
      page: pageNum,
      pageSize: pageSize
    });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ success: false, error: err.toString() });
  }
});

// UPDATE a call log entry
app.put("/call/:id", async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });
    const { id } = req.params;

    // Get all data to find the row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "CallLog!A:Z"
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);

    if (rowIndex === -1) {
      return res.status(404).json({ success: false, error: "Call log not found" });
    }

    // Update the row
    const updatedRow = [
      id,
      req.body.phone || rows[rowIndex][1] || "",
      req.body.name || rows[rowIndex][2] || "",
      req.body.city || rows[rowIndex][3] || "",
      req.body.firstTime || rows[rowIndex][4] || "",
      req.body.time || rows[rowIndex][5] || "",
      req.body.callType || rows[rowIndex][6] || "",
      req.body.purpose || rows[rowIndex][7] || "",
      req.body.result || rows[rowIndex][8] || "",
      req.body.notes || rows[rowIndex][9] || "",
      req.body.priority || rows[rowIndex][10] || "",
      req.body.duration || rows[rowIndex][11] || "",
      req.body.recordingUrl || rows[rowIndex][12] || ""
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `CallLog!A${rowIndex + 1}:M${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [updatedRow] }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ success: false, error: err.toString() });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
