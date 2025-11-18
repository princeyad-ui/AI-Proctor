// server/index.js - full working example
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs-extra");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// simple request logger
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// storage
const STORAGE_DIR = path.join(__dirname, "evidence");
fs.ensureDirSync(STORAGE_DIR);

// serve saved evidence files
app.use("/evidence", express.static(path.join(__dirname, "evidence")));

// multer memory storage
const upload = multer({ storage: multer.memoryStorage() });

// in-memory DB
const SESSIONS = {};
const EVENTS = [];

// root
app.get("/", (req, res) => res.send("AI Proctoring API Running..."));

// start session
app.post("/api/start-session", (req, res) => {
  const sessionId = uuidv4();
  SESSIONS[sessionId] = { sessionId, startedAt: new Date().toISOString(), events: [], evidence: [], endedAt: null, riskScore: 0 };
  console.log("Session started:", sessionId);
  res.json({ success: true, sessionId });
});

// receive frame
app.post("/api/frame", upload.single("frame"), async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId || !SESSIONS[sessionId]) return res.status(400).json({ success:false, message:"Invalid sessionId" });
    if (!req.file) return res.status(400).json({ success:false, message:"No frame uploaded" });

    const sessDir = path.join(STORAGE_DIR, sessionId);
    await fs.ensureDir(sessDir);

    const filename = `${Date.now()}_${uuidv4()}.jpg`;
    const filepath = path.join(sessDir, filename);
    await fs.writeFile(filepath, req.file.buffer);

    const ev = { type: "frame", path: filepath, timestamp: new Date().toISOString() };
    SESSIONS[sessionId].evidence.push(ev);

    res.json({ success: true, message: "Frame saved", evidence: ev });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success:false, error: String(err) });
  }
});

// receive audio
app.post("/api/audio", upload.single("audio"), async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId || !SESSIONS[sessionId]) return res.status(400).json({ success:false, message:"Invalid sessionId" });
    if (!req.file) return res.status(400).json({ success:false, message:"No audio uploaded" });

    const sessDir = path.join(STORAGE_DIR, sessionId);
    await fs.ensureDir(sessDir);

    const filename = `${Date.now()}_${uuidv4()}.webm`;
    const filepath = path.join(sessDir, filename);
    await fs.writeFile(filepath, req.file.buffer);

    const ev = { type: "audio", path: filepath, timestamp: new Date().toISOString() };
    SESSIONS[sessionId].evidence.push(ev);

    res.json({ success: true, message: "Audio saved", evidence: ev });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success:false, error: String(err) });
  }
});

// alerts
app.post("/api/alerts", (req, res) => {
  const { sessionId, type, severity = "medium", details = "" } = req.body;
  if (!sessionId || !SESSIONS[sessionId]) return res.status(400).json({ success:false, message:"Invalid sessionId" });

  const event = { id: uuidv4(), sessionId, type, severity, details, timestamp: new Date().toISOString() };
  SESSIONS[sessionId].events.push(event);
  EVENTS.push(event);

  console.log("Alert:", event);
  res.json({ success:true, event });
});

// end session
app.post("/api/end-session", (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId || !SESSIONS[sessionId]) return res.status(400).json({ success:false, message:"Invalid sessionId" });

  const session = SESSIONS[sessionId];
  session.endedAt = new Date().toISOString();
  session.riskScore = session.events.length;
  res.json({ success:true, session });
});

// get report
app.get("/api/report/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId || !SESSIONS[sessionId]) return res.status(404).json({ success:false, message:"Session not found" });
  res.json({ success:true, session: SESSIONS[sessionId] });
});

// list sessions
app.get("/api/sessions", (req, res) => {
  res.json({ success:true, sessions: Object.values(SESSIONS) });
});

// start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

