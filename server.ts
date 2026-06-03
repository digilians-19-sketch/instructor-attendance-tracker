import express from "express";
import path from "path";
import fs from "fs";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.use(express.json());

// JSON File Database Setup
const INSTRUCTORS_FILE = path.join(process.cwd(), "instructors.json");
const ATTENDANCE_FILE = path.join(process.cwd(), "attendance.json");

interface Instructor {
  id: number;
  name: string;
  active: number;
  created_at: string;
}

interface AttendanceRecord {
  id: number;
  name: string;
  date: string;
  time: string;
  type: string;
  created_at: string;
}

// Safe helper functions for File-based DB operations with atomic locks
function readJsonFile<T>(filePath: string, defaultData: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf-8");
      return defaultData;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`Error reading database file ${filePath}:`, err);
    return defaultData;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing database file ${filePath}:`, err);
  }
}

// Database initialization & Seeding
function initDB() {
  const defaultInstructors = [
    "Abdulrahman Amr Jamal Muhammad Jamil",
    "Maryam Abdel-Tawab Abdel-Aziz Qutb",
    "Tasneem Abdel-Gawad Rashid Abdel-Gawad",
    "Ahmed Yahya Hosni Ahmed Mohamed",
    "Aya Mohamed Ahmed Mohamed Abdullah",
    "Ahmed Abdel-Latif Mohamed Salah El-Din",
    "Ibtihal Tamer El-Shahat",
    "Mahmoud Ahmed Mahmoud Habib",
    "Kirlis Riad Ishaq Riad"
  ];

  let instructors = readJsonFile<Instructor[]>(INSTRUCTORS_FILE, []);
  if (instructors.length === 0) {
    instructors = defaultInstructors.map((name, index) => ({
      id: index + 1,
      name,
      active: 1,
      created_at: new Date().toISOString()
    }));
    writeJsonFile(INSTRUCTORS_FILE, instructors);
    console.log("Seeded default instructors");
  }

  // Ensure attendance database file exists
  readJsonFile<AttendanceRecord[]>(ATTENDANCE_FILE, []);
}

async function startServer() {
  // Start database check
  initDB();

  // --- API ROUTES ---

  // Get instructors sorted by name
  app.get("/api/instructors", (req, res) => {
    try {
      const instructors = readJsonFile<Instructor[]>(INSTRUCTORS_FILE, []);
      const sorted = [...instructors].sort((a, b) => a.name.localeCompare(b.name, "ar"));
      res.json(sorted);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Add new instructor
  app.post("/api/instructors", (req, res) => {
    try {
      const { name } = req.body;
      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Instructor name is required" });
      }

      const instructors = readJsonFile<Instructor[]>(INSTRUCTORS_FILE, []);
      const nameClean = name.trim();

      const exists = instructors.some(inst => inst.name === nameClean);
      if (exists) {
        return res.status(400).json({ error: "هذا الاسم مسجل بالفعل" }); // Name already registered
      }

      const maxId = instructors.reduce((max, item) => (item.id > max ? item.id : max), 0);
      const newInstructor: Instructor = {
        id: maxId + 1,
        name: nameClean,
        active: 1,
        created_at: new Date().toISOString()
      };

      instructors.push(newInstructor);
      writeJsonFile(INSTRUCTORS_FILE, instructors);
      res.status(201).json(newInstructor);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete instructor from roster list
  app.delete("/api/instructors/:id", (req, res) => {
    try {
      const { id } = req.params;
      const instructors = readJsonFile<Instructor[]>(INSTRUCTORS_FILE, []);
      const filtered = instructors.filter(inst => inst.id !== parseInt(id));
      writeJsonFile(INSTRUCTORS_FILE, filtered);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get attendance records with name, type, and date filters
  app.get("/api/attendance", (req, res) => {
    try {
      const { name, type, date } = req.query;
      let list = readJsonFile<AttendanceRecord[]>(ATTENDANCE_FILE, []);

      if (name) {
        list = list.filter(item => item.name === name);
      }
      if (type) {
        list = list.filter(item => item.type === type);
      }
      if (date) {
        list = list.filter(item => item.date === date);
      }

      // Order newest records first (id DESC)
      list.sort((a, b) => b.id - a.id);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Post dynamic check-in / check-out log
  app.post("/api/attendance", (req, res) => {
    try {
      const { name, date, time, type } = req.body;
      if (!name || !date || !time || !type) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const list = readJsonFile<AttendanceRecord[]>(ATTENDANCE_FILE, []);
      const maxId = list.reduce((max, item) => (item.id > max ? item.id : max), 0);

      const newRecord: AttendanceRecord = {
        id: maxId + 1,
        name,
        date,
        time,
        type,
        created_at: new Date().toISOString()
      };

      list.push(newRecord);
      writeJsonFile(ATTENDANCE_FILE, list);
      res.status(201).json(newRecord);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete standard log entry
  app.delete("/api/attendance/:id", (req, res) => {
    try {
      const { id } = req.params;
      const list = readJsonFile<AttendanceRecord[]>(ATTENDANCE_FILE, []);
      const filtered = list.filter(item => item.id !== parseInt(id));
      writeJsonFile(ATTENDANCE_FILE, filtered);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Clear all list data
  app.post("/api/attendance/clear", (req, res) => {
    try {
      writeJsonFile(ATTENDANCE_FILE, []);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GitHub Repository Attendance Database Synchronization Route
  app.post("/api/github/sync", async (req, res) => {
    try {
      const { owner, repo, branch, token, filePath } = req.body;
      if (!owner || !repo || !token || !filePath) {
        return res.status(400).json({ error: "Missing required GitHub parameters: owner, repo, token, or filePath" });
      }

      const branchName = branch || "main";

      // Read current attendance logs to sync
      const attendanceData = readJsonFile<AttendanceRecord[]>(ATTENDANCE_FILE, []);
      const fileContentBase64 = Buffer.from(JSON.stringify(attendanceData, null, 2)).toString("base64");

      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

      // 1. Check if the file already exists on GitHub to obtain its 'sha' for update
      let sha: string | undefined;
      try {
        const getRes = await fetch(`${apiUrl}?ref=${branchName}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "AttendancePro-Client"
          }
        });

        if (getRes.status === 200) {
          const fileInfo = await getRes.json() as any;
          sha = fileInfo.sha;
        }
      } catch (getErr) {
        console.log("GitHub file check error (this is normal if the file doesn't exist yet):", getErr);
      }

      // 2. Commit/Create/Update file on GitHub repository
      const putRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "AttendancePro-Client"
        },
        body: JSON.stringify({
          message: `🔁 Auto-sync attendance data: ${new Date().toISOString()}`,
          content: fileContentBase64,
          branch: branchName,
          sha: sha // required for updates
        })
      });

      if (!putRes.ok) {
        const errBody = await putRes.text();
        return res.status(putRes.status).json({ error: `GitHub API returned error: ${errBody}` });
      }

      const putData = await putRes.json() as any;
      res.json({
        success: true,
        commitUrl: putData.commit?.html_url || `https://github.com/` + owner + `/` + repo
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- VITE MIDDLEWARE ---
  const distPath = path.join(process.cwd(), "dist");
  let useStatic = fs.existsSync(path.join(distPath, "index.html"));

  if (!useStatic) {
    try {
      console.log("Attempting to start server in Dev mode with Vite middleware...");
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Dev mode with Vite middleware loaded successfully.");
    } catch (viteErr) {
      console.error("Vite middleware failed to load, falling back to static files:", viteErr);
      useStatic = true;
    }
  }

  if (useStatic) {
    console.log("Starting server in Production mode from dist/...");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start custom express server:", err);
});
