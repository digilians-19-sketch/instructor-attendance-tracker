import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import QRCode from "qrcode";
import {
  QrCode,
  LogOut,
  Trash2,
  Plus,
  Users,
  Calendar,
  Clock,
  Database,
  Download,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  UserCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  Github,
  GitBranch,
  Link
} from "lucide-react";
import { Instructor, AttendanceRecord } from "./types";

export default function App() {
  // Application Mode/Login States
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showLoginOverlay, setShowLoginOverlay] = useState<boolean>(false);
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState<boolean>(false);

  // Database States
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingInstructors, setLoadingInstructors] = useState<boolean>(false);
  const [loadingRecords, setLoadingRecords] = useState<boolean>(false);

  // Instructor Registration Form
  const [selectedInstructor, setSelectedInstructor] = useState<string>("");
  const [registrationDate, setRegistrationDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  
  // Feedback Success Overlay State
  const [successMsg, setSuccessMsg] = useState<{
    visible: boolean;
    type: "حضور" | "انصراف";
    title: string;
    detail: string;
  }>({
    visible: false,
    type: "حضور",
    title: "",
    detail: "",
  });

  // Admin Active tab
  const [adminTab, setAdminTab] = useState<"qr" | "records" | "stats" | "instructors" | "github">("qr");

  // Support automatic pre-selection and custom greeting when scanning a personal QR code
  const [scanPrefilled, setScanPrefilled] = useState<boolean>(false);

  // Dynamic QR generator states
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const instructorQrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrInstructorId, setQrInstructorId] = useState<string>("general");
  const [qrError, setQrError] = useState<string | null>(null);

  // GitHub Integration Configuration States
  const [gitOwner, setGitOwner] = useState<string>(() => localStorage.getItem("git_owner") || "");
  const [gitRepo, setGitRepo] = useState<string>(() => localStorage.getItem("git_repo") || "");
  const [gitBranch, setGitBranch] = useState<string>(() => localStorage.getItem("git_branch") || "main");
  const [gitFilePath, setGitFilePath] = useState<string>(() => localStorage.getItem("git_file_path") || "data/attendance.json");
  const [gitToken, setGitToken] = useState<string>(() => localStorage.getItem("git_token") || "");
  const [gitSyncing, setGitSyncing] = useState<boolean>(false);
  const [gitSyncError, setGitSyncError] = useState<string | null>(null);
  const [gitSyncSuccessUrl, setGitSyncSuccessUrl] = useState<string | null>(null);

  // Record Table Filters
  const [filterName, setFilterName] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");

  // Managing Instructors list
  const [newInstructorName, setNewInstructorName] = useState<string>("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAddingInstructor, setIsAddingInstructor] = useState<boolean>(false);

  // System Live Clock ticker
  const [liveDateTime, setLiveDateTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial instructors list on mount
  useEffect(() => {
    fetchInstructors();
  }, []);

  // Support automatic pre-selection and custom greeting when scanning a personal QR code
  useEffect(() => {
    if (instructors.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const queryId = params.get("id");
      const queryName = params.get("name");
      
      if (queryId) {
        const found = instructors.find(i => String(i.id) === String(queryId));
        if (found) {
          setSelectedInstructor(found.name);
          setScanPrefilled(true);
        }
      } else if (queryName) {
        const found = instructors.find(i => i.name.toLowerCase().includes(queryName.toLowerCase()));
        if (found) {
          setSelectedInstructor(found.name);
          setScanPrefilled(true);
        }
      }
    }
  }, [instructors]);

  // Generate dynamic instructor-specific or general QR Code inside QR Tab
  useEffect(() => {
    if (instructorQrCanvasRef.current) {
      const currentUrl = window.location.origin;
      const targetUrl = qrInstructorId === "general"
        ? currentUrl
        : `${currentUrl}?id=${qrInstructorId}`;

      QRCode.toCanvas(
        instructorQrCanvasRef.current,
        targetUrl,
        {
          width: 220,
          margin: 1,
          color: {
            dark: "#0f172a", // Slate 900
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) console.error("Error generating instructor QR:", error);
        }
      );
    }
  }, [qrInstructorId, instructorQrCanvasRef.current, instructors]);

  // Fetch record lists when Administrator is registered
  useEffect(() => {
    if (isAdmin) {
      fetchRecords();
    }
  }, [isAdmin, filterName, filterType, filterDate]);

  // Periodic silent auto-polling (every 5 seconds) to sync admin dashboard across devices in real-time
  useEffect(() => {
    if (!isAdmin) return;

    const intervalId = setInterval(() => {
      fetchRecords(true);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isAdmin, filterName, filterType, filterDate]);

  // Generate real dynamic QR code inside the Live Scan interface
  useEffect(() => {
    if (qrCanvasRef.current) {
      const currentUrl = window.location.origin;
      QRCode.toCanvas(
        qrCanvasRef.current,
        currentUrl,
        {
          width: 220,
          margin: 1,
          color: {
            dark: "#0f172a", // Slate 900 for high geometric contrast
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) {
            console.error("QRCode rendering standard error:", error);
            setQrError("حدث خطأ أثناء رصد رمز الاستجابة");
          } else {
            setQrError(null);
          }
        }
      );
    }
  }, [isAdmin, adminTab, qrCanvasRef.current]);

  // RPC endpoints helper
  const fetchInstructors = async () => {
    setLoadingInstructors(true);
    try {
      const res = await fetch("/api/instructors");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInstructors(data);
    } catch {
      console.error("فشل تحميل قائمة المحاضرين");
    } finally {
      setLoadingInstructors(false);
    }
  };

  const handleGitHubSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setGitSyncError(null);
    setGitSyncSuccessUrl(null);
    setGitSyncing(true);

    try {
      const response = await fetch("/api/github/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: gitOwner.trim(),
          repo: gitRepo.trim(),
          branch: gitBranch.trim(),
          filePath: gitFilePath.trim(),
          token: gitToken.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "فشلت المزامنة. تأكد من صحة مستودع GitHub والتوكن المستخدم.");
      }

      // Persist configuration fields safely in localStorage
      localStorage.setItem("git_owner", gitOwner.trim());
      localStorage.setItem("git_repo", gitRepo.trim());
      localStorage.setItem("git_branch", gitBranch.trim());
      localStorage.setItem("git_file_path", gitFilePath.trim());
      localStorage.setItem("git_token", gitToken.trim());

      setGitSyncSuccessUrl(data.commitUrl);
    } catch (err: any) {
      setGitSyncError(err.message || "حدث خطأ غير متوقع أثناء المزامنة مع GitHub.");
    } finally {
      setGitSyncing(false);
    }
  };

  const fetchRecords = async (isSilent = false) => {
    if (!isSilent) setLoadingRecords(true);
    try {
      const params = new URLSearchParams();
      if (filterName) params.append("name", filterName);
      if (filterType) params.append("type", filterType);
      if (filterDate) params.append("date", filterDate);

      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecords(data);
    } catch {
      console.error("فشل تحميل السجلات");
    } finally {
      if (!isSilent) setLoadingRecords(false);
    }
  };

  // Submit instructor clock-in/out to server SQLite db
  const handleRegisterAttendance = async (type: "حضور" | "انصراف") => {
    if (!selectedInstructor) {
      alert("يرجى اختيار اسمك لتسجيل المعاملة");
      return;
    }
    if (!registrationDate) {
      alert("الرجاء اختيار تاريخ اليوم");
      return;
    }

    const now = new Date();
    const formattedTime = now.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedInstructor,
          date: registrationDate,
          time: formattedTime,
          type: type,
        }),
      });

      if (!response.ok) throw new Error("فشل الحفظ في قاعدة البيانات");

      setSuccessMsg({
        visible: true,
        type: type,
        title: type === "حضور" ? "تم تسجيل حضورك بنجاح!" : "تم تسجيل انصرافك بنجاح!",
        detail: `${selectedInstructor.split(" ")[0]} — بتاريخ ${registrationDate} في تمام الساعة ${formattedTime}`,
      });

      // Reset
      setSelectedInstructor("");

      setTimeout(() => {
        setSuccessMsg((prev) => ({ ...prev, visible: false }));
      }, 4500);

      if (isAdmin) {
        fetchRecords();
      }
    } catch (err: any) {
      alert(err.message || "حدث خطأ غير متوقع");
    }
  };

  // Create new instructor record with SQLite unique key validation
  const handleAddInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const nameClean = newInstructorName.trim();
    if (!nameClean) return;

    setIsAddingInstructor(true);
    try {
      const response = await fetch("/api/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameClean }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "خطأ أثناء إضافة المحاضر");
      }

      setNewInstructorName("");
      await fetchInstructors();
      alert("تمت الإضافة بنجاح");
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setIsAddingInstructor(false);
    }
  };

  // Securely delete instructors from admin panel
  const handleDeleteInstructor = async (id: number, name: string) => {
    if (!confirm(`حذف المحاضر: "${name}" من قاعدة بيانات SQLite اليومية؟`)) return;
    try {
      const response = await fetch(`/api/instructors/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("تعذر حذف الاسم");
      fetchInstructors();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete specific log items
  const handleDeleteRecord = async (id: number) => {
    if (!confirm("هل أنت متأكد من رغبتك بحذف حركة الحضور هذه؟")) return;
    try {
      const response = await fetch(`/api/attendance/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      fetchRecords();
    } catch {
      alert("تعذر حذف السجل الفعلي.");
    }
  };

  // Wipe attendance table logs securely
  const handleClearAllRecords = async () => {
    if (!confirm("تنبيه: سيتم مسح كافة حركات الحضور المسجلة بقاعدة البيانات. هل تريد المتابعة؟")) return;
    try {
      const response = await fetch("/api/attendance/clear", { method: "POST" });
      if (!response.ok) throw new Error();
      fetchRecords();
      alert("تم مسح كافة السجلات.");
    } catch {
      alert("تعذر تفريغ قاعدة البيانات.");
    }
  };

  // Login handler
  const handleLoginSubmit = () => {
    if (adminPassword === "admin2025") {
      setIsAdmin(true);
      setShowLoginOverlay(false);
      setAdminPassword("");
      setLoginError(null);
    } else {
      setLoginError("كلمة المرور المسجلة غير صحيحة.");
      setAdminPassword("");
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setAdminTab("qr");
  };

  // Download reports directly as standardized Unicode CSV readable in Excel
  const handleExportCSV = () => {
    if (!records.length) {
      alert("لا تتوفر أي حركات لتصديرها.");
      return;
    }

    const headers = ["الرقم", "اسم المحاضر", "التاريخ الفعلي", "الوقت الفعلي", "نوع الحالة"];
    const rows = records.map((r, i) => [
      i + 1,
      r.name,
      r.date,
      r.time,
      r.type,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${val}"`).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `تقرير_الحضور_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Total stat numbers
  const totalLogs = records.length;
  const totalCheckIns = records.filter((r) => r.type === "حضور").length;
  const totalCheckOuts = records.filter((r) => r.type === "انصراف").length;
  const uniqueDays = [...new Set(records.map((r) => r.date))].length;

  const freqMap: Record<string, { checkIn: number; checkOut: number }> = {};
  instructors.forEach((inst) => {
    freqMap[inst.name] = { checkIn: 0, checkOut: 0 };
  });
  records.forEach((rec) => {
    if (!freqMap[rec.name]) {
      freqMap[rec.name] = { checkIn: 0, checkOut: 0 };
    }
    if (rec.type === "حضور") freqMap[rec.name].checkIn += 1;
    if (rec.type === "انصراف") freqMap[rec.name].checkOut += 1;
  });

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col justify-between text-brand-text" dir="rtl">
      
      {/* HEADER BAR (Geometric style) */}
      <header className="no-print h-16 bg-white border-b border-brand-border flex items-center justify-between px-6 sm:px-8 shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-brand-dark flex items-center justify-center text-white font-black text-xl">🏛️</div>
          <h1 className="text-sm md:text-base font-bold tracking-tight text-slate-800 underline underline-offset-4 decoration-2 decoration-brand-blue">
            ATTENDANCE PRO / <span className="text-slate-500 font-medium">سجلات حضور المحاضرين</span>
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:block text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Time Sequence</p>
            <p className="text-xs font-mono font-bold text-slate-600">
              {liveDateTime.toLocaleDateString("en-CA")} {liveDateTime.toLocaleTimeString("en-US", { hour12: true })}
            </p>
          </div>
          <div className="hidden sm:block w-px h-8 bg-slate-200"></div>
          
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-black text-slate-700">دخول المشرف</span>
                <button
                  onClick={handleLogout}
                  className="bg-brand-dark text-white text-[10px] uppercase font-black px-3 py-1.5 hover:bg-brand-blue transition-all cursor-pointer rounded-none border border-brand-dark"
                >
                   تسجيل الخروج
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowLoginOverlay(true);
                  setLoginError(null);
                }}
                className="bg-brand-dark text-white text-[11px] font-extrabold px-4 py-2 hover:bg-brand-blue transition-all flex items-center gap-1.5 cursor-pointer rounded-none"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>تسجيل الدخول كإدارة</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* SUCCESS ALERTS OVERLAY */}
        <AnimatePresence>
          {successMsg.visible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-xl mx-auto mb-8 bg-white border-2 border-brand-blue p-6 text-center shadow-lg relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-brand-blue" />
              <div className="w-12 h-12 bg-blue-50 border border-brand-blue rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-brand-blue" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">{successMsg.title}</h3>
              <p className="text-xs font-bold text-slate-500">{successMsg.detail}</p>
              <span className="inline-block mt-3 bg-brand-sky text-brand-blue text-[10px] font-mono px-3 py-1 rounded-none border border-slate-200">
                DATABASE SAVED: sqlite3.db_sync
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- INSTRUCTOR VIEW (CHECK IN SCREEN) --- */}
        {!isAdmin ? (
          <div className="max-w-xl mx-auto my-6 sm:my-12">
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-brand-border shadow-sm relative p-8 sm:p-10"
            >
              {/* Geometric Balance corner frames */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-brand-blue"></div>
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-brand-blue"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-brand-blue"></div>
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-brand-blue"></div>

              <div className="text-center mb-8">
                <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-1.5">
                  🏛️ INSTRUCTOR GATEWAY
                </p>
                <h2 className="text-xl font-bold tracking-tight text-brand-dark">تسجيل الحضور والانصراف اليومي</h2>
                <div className="w-12 h-0.5 bg-brand-blue mx-auto mt-2.5"></div>
              </div>

              {scanPrefilled && (
                <div className="bg-emerald-50 border border-emerald-300 p-4 mb-6 relative text-right">
                  <div className="absolute top-2 left-2 text-emerald-500 text-sm">✓</div>
                  <h4 className="text-emerald-800 font-black text-xs mb-1">👋 أهلاً بك يا دكتور!</h4>
                  <p className="text-emerald-700 text-2xs font-bold leading-relaxed">
                    لقد قمت بمسح رمز الاستجابة السريعة (QR) الخاص بك بنجاح. لقد تم التعرف عليك وتحديد اسمك تلقائياً لبدء تسجيل الحضور أو الانصراف.
                  </p>
                </div>
              )}

              {/* Attendance Form inputs */}
              <div className="space-y-6">
                
                <div className="space-y-1.5">
                  <label htmlFor="instructor-picker" className="block text-slate-600 font-bold text-xs uppercase tracking-wider">
                    👤 اختر المحاضر الفعلي
                  </label>
                  <select
                    id="instructor-picker"
                    value={selectedInstructor}
                    onChange={(e) => setSelectedInstructor(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-brand-border focus:border-brand-blue focus:bg-white px-4 py-3.5 font-bold text-sm outline-none rounded-none transition-all cursor-pointer"
                    disabled={loadingInstructors}
                  >
                    <option value="">-- اختر اسمك من القائمة --</option>
                    {instructors.map((inst) => (
                      <option key={inst.id} value={inst.name}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                  {loadingInstructors && (
                    <p className="text-[10px] text-brand-blue font-bold flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      جاري تحميل القائمة من SQLite...
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="reg-date" className="block text-slate-600 font-bold text-xs uppercase tracking-wider">
                    📅 تاريخ التسجيل
                  </label>
                  <input
                    id="reg-date"
                    type="date"
                    value={registrationDate}
                    onChange={(e) => setRegistrationDate(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-brand-border focus:border-brand-blue focus:bg-white px-4 py-3.5 font-bold text-sm outline-none rounded-none transition-all"
                  />
                </div>

                {/* Submit Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  
                  <button
                    onClick={() => handleRegisterAttendance("حضور")}
                    disabled={!selectedInstructor}
                    className="w-full py-4 bg-brand-dark text-white font-black text-sm tracking-widest uppercase hover:bg-brand-blue disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 rounded-none"
                  >
                    <UserCheck className="w-4 h-4" />
                    تسجيل الحضور (Check-In)
                  </button>

                  <button
                    onClick={() => handleRegisterAttendance("انصراف")}
                    disabled={!selectedInstructor}
                    className="w-full py-4 border-2 border-brand-dark text-brand-dark font-black text-sm tracking-widest uppercase hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 rounded-none"
                  >
                    <LogOut className="w-4 h-4" />
                    تسجيل الانصراف (Check-Out)
                  </button>

                </div>

              </div>

              {/* Dynamic Bottom Status bar */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  بروتوكول تخزين SQLite3 مشفر مدمج
                </span>
                <span>Active / Secure Connection</span>
              </div>

            </motion.div>
          </div>
        ) : (
          
          /* --- ADMIN PORTAL MAIN CONSOLE --- */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border border-brand-border bg-white min-h-[640px]">
            
            {/* Left Sidebar Layout: Scanner UI presentation & Active Links */}
            <aside className="lg:col-span-4 border-l lg:border-l border-brand-border flex flex-col p-8 bg-white justify-between">
              
              <div className="space-y-6">
                <div>
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Live Scan Interface</h2>
                  <p className="text-[11px] text-slate-500 font-bold">رصد المحاضرين الفعلي ومسح QR Code</p>
                </div>

                {/* Aspect-square dynamic QR scan mockup with laser line! */}
                <div className="scanner-frame border border-brand-dark relative overflow-hidden shadow-xs">
                  {/* Geometric absolute border brackets */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-brand-blue"></div>
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-brand-blue"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-brand-blue"></div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-brand-blue"></div>

                  {/* QR Canvas */}
                  <div className="bg-white p-2.5 z-10 select-none">
                    {qrError ? (
                      <p className="text-rose-500 text-xs font-bold">{qrError}</p>
                    ) : (
                      <canvas ref={qrCanvasRef} className="max-w-full aspect-square" />
                    )}
                  </div>

                  {/* Moving high-tech scanning line */}
                  <div className="scanner-laser" />
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active QR Link</p>
                  <p className="text-2xs font-mono font-bold text-slate-600 break-all">{window.location.origin}</p>
                </div>

              </div>

              {/* Sidebar Action tools */}
              <div className="space-y-3 mt-8 pt-6 border-t border-slate-100">
                <button
                  onClick={() => setAdminTab("instructors")}
                  className="w-full py-4 bg-brand-dark hover:bg-brand-blue text-white font-extrabold text-xs tracking-widest uppercase transition-colors flex items-center justify-center gap-2 rounded-none cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  إدارة المحاضرين بقاعدة البيانات
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full py-4 border-2 border-brand-dark text-brand-dark hover:bg-slate-50 font-extrabold text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 rounded-none cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  تصدير تقارير الحضور (CSV)
                </button>
              </div>

            </aside>

            {/* Right Panel Layout: Data Grid Dashboard */}
            <div className="lg:col-span-8 bg-slate-50 flex flex-col justify-between">
              
              <div className="flex flex-col">
                
                {/* 1. Counter display grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-brand-border">
                  <div className="p-5 border-r border-slate-200 bg-white">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Today</p>
                    <p className="text-2xl font-black text-slate-800">{totalLogs}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">حركات اليوم</p>
                  </div>
                  <div className="p-5 border-r border-slate-200 bg-white">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Check-in</p>
                    <p className="text-2xl font-black text-emerald-600">{totalCheckIns}</p>
                    <p className="text-[10px] text-green-500 font-bold mt-1">تسجيلات حضور</p>
                  </div>
                  <div className="p-5 border-r border-slate-200 bg-white">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Check-out</p>
                    <p className="text-2xl font-black text-rose-600">{totalCheckOuts}</p>
                    <p className="text-[10px] text-rose-500 font-bold mt-1">تسجيلات انصراف</p>
                  </div>
                  <div className="p-5 bg-white">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unique Days</p>
                    <p className="text-2xl font-black text-brand-blue">{uniqueDays}</p>
                    <p className="text-[10px] text-blue-500 font-bold mt-1">أيام العمل المرصودة</p>
                  </div>
                </div>

                {/* 2. Unified Navigation tabs switcher inside right panel */}
                <nav className="no-print bg-white border-b border-brand-border p-3.5 flex flex-wrap gap-2">
                  <button
                    onClick={() => setAdminTab("qr")}
                    className={`px-4 py-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      adminTab === "qr"
                        ? "bg-brand-dark text-white rounded-none shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    📱 كود الاستجابة QR
                  </button>
                  <button
                    onClick={() => setAdminTab("records")}
                    className={`px-4 py-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      adminTab === "records"
                        ? "bg-brand-dark text-white rounded-none shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    📋 سجلات الحضور والغياب
                  </button>
                  <button
                    onClick={() => setAdminTab("stats")}
                    className={`px-4 py-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      adminTab === "stats"
                        ? "bg-brand-dark text-white rounded-none shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    📊 التردد والإحصائيات
                  </button>
                  <button
                    onClick={() => setAdminTab("instructors")}
                    className={`px-4 py-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      adminTab === "instructors"
                        ? "bg-brand-dark text-white rounded-none shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    👤 قائمة المحاضرين
                  </button>
                  <button
                    onClick={() => setAdminTab("github")}
                    className={`px-4 py-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      adminTab === "github"
                        ? "bg-brand-dark text-white rounded-none shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    🔗 مزامنة GitHub
                  </button>
                </nav>

                {/* 3. Render contents depending on active admin tab */}
                <div className="p-6 sm:p-8 flex-grow">
                  
                  {/* ADMIN TAB: QR SPEC DETAILS */}
                  {adminTab === "qr" && (
                    <div className="space-y-6">
                      <div className="bg-white border border-brand-border p-6 relative">
                        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-brand-blue"></div>
                        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-brand-blue"></div>
                        
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
                          <div className="w-2.5 h-2.5 bg-brand-blue"></div>
                          توليد أكواد الاستجابة السريعة (QR Code) لتسجيل حضور المحاضرين
                        </h3>
                        <p className="text-xs text-brand-text-muted leading-relaxed">
                          يمكنك توليد رمز QR عام للبوابة للدخول واختيار الاسم يدويًا، أو توليد رمز QR مخصص لكل محاضر على حدة، بحيث يتم مسح الرمز وتحديد الاسم تلقائيًا على هاتفه لتسهيل وتيسير عملية الحضور الذاتي المأمن.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* QR Configuration Panel */}
                        <div className="bg-white border border-brand-border p-6 space-y-4">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">⚙️ إعداد الرمز المتولد</h4>
                          
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-500 uppercase">نوع رمز الاستجابة السريعة</label>
                            <select
                              value={qrInstructorId}
                              onChange={(e) => setQrInstructorId(e.target.value)}
                              className="w-full text-slate-800 bg-slate-50 border border-brand-border focus:border-brand-blue focus:bg-white px-3 py-2.5 font-bold text-xs outline-none rounded-none transition-all cursor-pointer"
                            >
                              <option value="general">🌐 رمز QR عام (رابط البوابة الرئيسي للجميع)</option>
                              {instructors.map((inst) => (
                                <option key={inst.id} value={String(inst.id)}>
                                  👤 {inst.name} (رمز حضور ذاتي فردي مخصص)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="bg-slate-50 p-4 border border-slate-200 space-y-2">
                            <span className="block text-[9px] font-black text-slate-400 uppercase">الرابط المبرمج داخل هذا الرمز</span>
                            <div className="font-mono text-2xs text-slate-600 break-all select-all inline-block font-bold">
                              {qrInstructorId === "general"
                                ? window.location.origin
                                : `${window.location.origin}/?id=${qrInstructorId}`}
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={() => window.print()}
                              className="w-full bg-brand-dark hover:bg-brand-blue text-white font-black text-xs py-3.5 px-6 rounded-none transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              🖨️ طباعة لوحة الـ QR المتولدة
                            </button>
                          </div>
                        </div>

                        {/* QR Visual display */}
                        <div className="bg-white border border-brand-border p-6 flex flex-col items-center justify-center space-y-4 relative">
                          <div className="absolute top-2 right-2 text-slate-300 font-mono text-[9px] font-bold">PREVIEW PANEL</div>
                          
                          <div className="p-3 border-2 border-slate-100 bg-white shadow-xs">
                            <canvas ref={instructorQrCanvasRef} className="max-w-full" />
                          </div>

                          <div className="text-center space-y-1">
                            <span className="text-xs font-black text-slate-800">
                              {qrInstructorId === "general"
                                ? "البوابة العامة للمحاضرين"
                                : (instructors.find(i => String(i.id) === qrInstructorId)?.name || "رابط مخصص")}
                            </span>
                            <p className="text-[10px] text-slate-400 font-bold">
                              {qrInstructorId === "general"
                                ? "يمكن لجميع المدربين والمحاضرين مسح الرمز"
                                : "مسح سريع ومباشر لتسجيل حضور المحاضر المذكور فقط"}
                            </p>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* ADMIN TAB: RECORDS LIST */}
                  {adminTab === "records" && (
                    <div className="space-y-6">
                      
                      {/* Advanced Search Filter Inputs */}
                      <div className="bg-white border border-brand-border p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase">👤 تصفية بالمحاضر</label>
                          <select
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-2 text-xs font-bold"
                          >
                            <option value="">كل المحاضرين</option>
                            {instructors.map((i) => (
                              <option key={i.id} value={i.name}>{i.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase">🏷️ الحالة</label>
                          <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-2 text-xs font-bold"
                          >
                            <option value="">الكل</option>
                            <option value="حضور">حضور</option>
                            <option value="انصراف">انصراف</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase">📅 التاريخ اليومي</label>
                          <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-none px-3 py-2 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <button
                            onClick={() => {
                              setFilterName("");
                              setFilterType("");
                              setFilterDate("");
                            }}
                            className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-xs py-2 rounded-none transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            تفريغ الخيارات
                          </button>
                        </div>
                      </div>

                      {/* Header line */}
                      <div className="flex items-center justify-between">
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500"></div>
                          جدول حضور المحاضرين المؤرشف
                        </h2>
                        <button
                          onClick={handleClearAllRecords}
                          className="text-brand-red hover:bg-rose-50 text-[11px] font-bold py-1 px-2 border border-rose-200 hover:border-brand-red transition-all cursor-pointer"
                        >
                          Wipe Data Logs
                        </button>
                      </div>

                      {/* Records Table view */}
                      {loadingRecords ? (
                        <div className="text-center py-12 text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-blue" />
                          <span className="text-xs font-bold">جاري المزامنة مع خادم SQLite...</span>
                        </div>
                      ) : !records.length ? (
                        <div className="text-center py-12 border-2 border-dashed border-slate-200 bg-white">
                          <p className="text-xs font-bold text-slate-400">لا تتوفر أي حركات مسجلة حالياً تطابق الفرز.</p>
                        </div>
                      ) : (
                        <div className="bg-white border border-brand-border">
                          <table className="w-full border-collapse text-right">
                            <thead>
                              <tr className="bg-slate-50 border-b border-brand-border text-slate-400 text-[10px] font-black uppercase">
                                <th className="p-3 text-center">الرقم</th>
                                <th className="p-3">المحاضر</th>
                                <th className="p-3 text-center">تاريخ المعاملة</th>
                                <th className="p-3 text-center">الوقت الفعلي</th>
                                <th className="p-3 text-center">الحالة</th>
                                <th className="p-3 text-center w-12">حذف</th>
                              </tr>
                            </thead>
                            <tbody>
                              {records.map((r, i) => (
                                <tr key={r.id} className="border-b border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50/50">
                                  <td className="p-3 text-center font-mono text-slate-400">{i + 1}</td>
                                  <td className="p-3 text-slate-900">{r.name}</td>
                                  <td className="p-3 text-center font-mono text-slate-500">{r.date}</td>
                                  <td className="p-3 text-center font-mono text-slate-500">{r.time}</td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`px-3 py-0.5 text-[9px] font-black uppercase rounded-xs ${
                                        r.type === "حضور"
                                          ? "bg-green-100 text-green-700"
                                          : "bg-rose-100 text-rose-700"
                                      }`}
                                    >
                                      {r.type === "حضور" ? "IN (حركة حضور)" : "OUT (حركة انصراف)"}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <button
                                      onClick={() => handleDeleteRecord(r.id)}
                                      className="text-slate-300 hover:text-brand-red p-1 cursor-pointer transition-colors"
                                    >
                                      🗑
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                    </div>
                  )}

                  {/* ADMIN TAB: FREQUENCY & STATS */}
                  {adminTab === "stats" && (
                    <div className="space-y-6">
                      <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-brand-blue"></div>
                        مستويات تفاعل حضور كل محاضر الفردي
                      </h2>

                      <div className="bg-white border border-brand-border">
                        <table className="w-full border-collapse text-right">
                          <thead>
                            <tr className="bg-slate-50 border-b border-brand-border text-slate-400 text-[10px] font-black uppercase">
                              <th className="p-3">اسم المحاضر الكامل</th>
                              <th className="p-3 text-center">عدد مرات الحضور (In)</th>
                              <th className="p-3 text-center">عدد مرات الانصراف (Out)</th>
                              <th className="p-3 text-center">المجموع العام للعمليات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {instructors.map((i) => {
                              const match = freqMap[i.name] || { checkIn: 0, checkOut: 0 };
                              return (
                                <tr key={i.id} className="border-b border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100/50">
                                  <td className="p-3 text-slate-900">{i.name}</td>
                                  <td className="p-3 text-center">
                                    <span className="bg-green-50 text-green-600 font-bold px-2 py-0.5 font-mono text-[10px] border border-green-200">
                                      {match.checkIn} Check-Ins
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className="bg-rose-50 text-rose-600 font-bold px-2 py-0.5 font-mono text-[10px] border border-rose-200">
                                      {match.checkOut} Check-Outs
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-mono text-slate-500">{match.checkIn + match.checkOut}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ADMIN TAB: MANAGE LECTURERS */}
                  {adminTab === "instructors" && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      
                      {/* Registering Form */}
                      <div className="md:col-span-5 bg-white border border-brand-border p-5 space-y-4">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">➕ تسجيل وإضافة محاضر جديد بـ SQLite</h3>
                        
                        <form onSubmit={handleAddInstructor} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 block">اسم المحاضر بالكامل</label>
                            <input
                              type="text"
                              required
                              value={newInstructorName}
                              onChange={(e) => setNewInstructorName(e.target.value)}
                              placeholder="مثال: د. مريم التواب عبدالعزيز"
                              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-none px-4 py-3 outline-none focus:border-brand-blue"
                            />
                          </div>

                          {addError && (
                            <div className="text-[10px] text-rose-600 bg-rose-50 border border-rose-200 p-2 font-bold">
                              {addError}
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isAddingInstructor}
                            className="w-full py-3 bg-brand-dark hover:bg-brand-blue disabled:opacity-50 text-white font-extrabold text-[11px] tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 rounded-none cursor-pointer"
                          >
                            {isAddingInstructor ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            حفظ المحاضر في المعاجم للعمل المباشر
                          </button>
                        </form>
                      </div>

                      {/* Active Instructors list */}
                      <div className="md:col-span-7 bg-white border border-brand-border p-5 space-y-4">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">📋 القائمة الفعّالة المرصودة</h3>
                        
                        {loadingInstructors ? (
                          <div className="text-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-brand-blue" />
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto border border-slate-200">
                            {instructors.map((i, idx) => (
                              <div key={i.id} className="flex items-center justify-between py-2.5 px-3 hover:bg-slate-50">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 bg-slate-100 font-mono text-[9px] font-black text-slate-400 flex items-center justify-center rounded-xs">
                                    {idx + 1}
                                  </span>
                                  <span className="text-xs font-bold text-slate-800">{i.name}</span>
                                </div>
                                <button
                                  onClick={() => handleDeleteInstructor(i.id, i.name)}
                                  className="text-slate-300 hover:text-brand-red p-1 cursor-pointer transition-colors text-xs"
                                >
                                  🗑
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {/* ADMIN TAB: GITHUB INTEGRATION */}
                  {adminTab === "github" && (
                    <div className="space-y-6">
                      <div className="bg-white border border-brand-border p-6 relative">
                        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-brand-blue"></div>
                        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-brand-blue"></div>
                        
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
                          <div className="w-2.5 h-2.5 bg-brand-blue"></div>
                          البوابة المكاملة مع مستودع GitHub للأرشفة السحابية الآمنة
                        </h3>
                        <p className="text-xs text-brand-text-muted leading-relaxed">
                          تمكّن هذه الأداة إدارة النظام من مزامنة قاعدة بيانات الحضور الحالية مباشرةً مع مستودع GitHub خارجي كنسخة احتياطية مأمنة. سيتم إرسال وحفظ السجلات بصيغة JSON على المسار والفرع المحددين لتوفير أرشفة مشفرة ومستمرة.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        
                        {/* Configuration Form */}
                        <form onSubmit={handleGitHubSync} className="md:col-span-7 bg-white border border-brand-border p-6 space-y-4 text-right">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">📂 إعدادات الاتصال بمستودع GitHub</h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-500 block">مالك المستودع (Username / Org)</label>
                              <input
                                type="text"
                                required
                                value={gitOwner}
                                onChange={(e) => setGitOwner(e.target.value)}
                                placeholder="مثال: octocat"
                                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 px-3 py-2.5 outline-none focus:border-brand-blue rounded-none"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-500 block">اسم المستودع (Repository Name)</label>
                              <input
                                type="text"
                                required
                                value={gitRepo}
                                onChange={(e) => setGitRepo(e.target.value)}
                                placeholder="مثال: attendance-data"
                                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 px-3 py-2.5 outline-none focus:border-brand-blue rounded-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-500 block">الفرع النشط (Branch)</label>
                              <input
                                type="text"
                                required
                                value={gitBranch}
                                onChange={(e) => setGitBranch(e.target.value)}
                                placeholder="main"
                                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 px-3 py-2.5 outline-none focus:border-brand-blue rounded-none font-mono"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-500 block">مسار الملف بالمستودع (File Path)</label>
                              <input
                                type="text"
                                required
                                value={gitFilePath}
                                onChange={(e) => setGitFilePath(e.target.value)}
                                placeholder="data/attendance.json"
                                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 px-3 py-2.5 outline-none focus:border-brand-blue rounded-none font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5 flex flex-col">
                            <label className="text-[10px] font-black text-slate-500 block">رمز الوصول الشخصي المأمن (GitHub Personal Access Token - PAT)</label>
                            <input
                              type="password"
                              required
                              value={gitToken}
                              onChange={(e) => setGitToken(e.target.value)}
                              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxx"
                              className="w-full text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-2.5 outline-none focus:border-brand-blue rounded-none"
                            />
                            <p className="text-[9px] text-slate-400 font-bold leading-normal mt-1">
                              ⚠️ رمز المرور محفوظ محليًا بمتصفحك فقط لأغراض المزامنة. احرص على استخدام الرمز بصلاحيات الكتابة (write repo contents).
                            </p>
                          </div>

                          {gitSyncError && (
                            <div className="text-2xs text-rose-700 bg-rose-50 border border-rose-200 p-3 font-bold flex items-center gap-1.5 text-right">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>{gitSyncError}</span>
                            </div>
                          )}

                          {gitSyncSuccessUrl && (
                            <div className="text-2xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 font-bold space-y-2 text-right">
                              <div className="flex items-center gap-1.5 justify-end">
                                <span>تمت المزامنة وحفظ نسخة الملف بنجاح على مستودع GitHub الخاص بك!</span>
                                <span className="text-emerald-500 font-bold text-sm">✓</span>
                              </div>
                              <a
                                href={gitSyncSuccessUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand-blue underline hover:text-brand-dark font-mono block text-3xs truncate"
                              >
                                {gitSyncSuccessUrl}
                              </a>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={gitSyncing}
                            className="w-full py-4 bg-brand-dark hover:bg-brand-blue disabled:opacity-50 text-white font-extrabold text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 rounded-none cursor-pointer"
                          >
                            {gitSyncing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                جاري المزامنة ودفع التحديثات...
                              </>
                            ) : (
                              <>
                                <Github className="w-4 h-4" />
                                مزامنة ورفع كافة السجلات الآن (Push to GitHub)
                              </>
                            )}
                          </button>
                        </form>

                        {/* Guide instructions */}
                        <div className="md:col-span-5 bg-slate-100 border border-slate-200 p-5 space-y-4 text-right">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 justify-end">
                            دليل التشغيل والمزامنة
                            <GitBranch className="w-4 h-4 text-brand-blue" />
                          </h4>

                          <div className="text-2xs text-slate-600 font-bold space-y-3 leading-relaxed">
                            <p>
                              لتفعيل النسخ الاحتياطي التلقائي والمزامنة مع GitHub بنجاح، يُرجى اتباع الخطوات البسيطة التالية:
                            </p>
                            <ol className="list-decimal list-inside space-y-2 text-slate-500 pr-0">
                              <li>قم بتسجيل الدخول إلى حسابك الشخصي على منصة GitHub.</li>
                              <li>أنشئ مستودعاً جديداً (مثال: <code className="font-mono bg-slate-200 p-0.5 px-1 font-bold">attendance-archive</code>).</li>
                              <li>قم بإنشاء توكن تسجيلي شخصي (Personal Access Token - Classic) بالانتقال إلى Settings &gt; Developer settings &gt; Personal access tokens.</li>
                              <li>قُم بتعيين الصلاحيات للملف وحدد الخيار <code className="font-mono bg-slate-200 p-0.5 px-1 font-extrabold">repo</code> للمستودعات الخاصة أو العامة.</li>
                              <li>انسخ التوكن الناتج وضعه في حقل رمز الوصول الشخصي هنا، ثم اضغط على زر "مزامنة" وسيتم رفع وحفظ ملف الحضور كنسخة مأمنة تلقائياً.</li>
                            </ol>
                            <div className="bg-white p-3 border border-slate-200 text-3xs font-black uppercase text-slate-400 space-y-1 text-left">
                              <div>DATABASE LOG SENSOR: ACTIVE</div>
                              <div>JSON BACKUP ENGINES: COMPLIANT</div>
                              <div>COMMIT VERIFICATION PROTOCOL: VERIFIED</div>
                            </div>
                          </div>

                        </div>

                      </div>
                    </div>
                  )}

                </div>

              </div>

              {/* Bottom Console Footer */}
              <footer className="h-12 bg-white flex items-center justify-between px-6 shrink-0 border-t border-brand-border">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_4px_#10b981]"></div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">SQLite Database Sync Active</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
                    <Database className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">BUILD v2.4.0.88</span>
                  </div>
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                  Encrypted Data Protocol / QR SUPPORT ENABLED
                </div>
              </footer>

            </div>

          </div>
        )}

      </main>

      {/* SYSTEM BOTTOM BRANDING FOOTER */}
      <footer className="no-print bg-white border-t border-brand-border py-6 mt-12 w-full text-center">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-extrabold gap-3">
          <span>© 1212 ATTENDANCE PRO — نظام مأمن للتتبع والأرشفة بقاعدة بيانات مدمجة. جميع الحقوق محفوظة.</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              SQLite3 Live Engine
            </span>
          </div>
        </div>
      </footer>

      {/* --- PASSWORD LOGIN OVERLAY (Geometric Style) --- */}
      <AnimatePresence>
        {showLoginOverlay && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white border border-brand-border rounded-none p-8 max-w-sm w-full relative space-y-6 shadow-2xl"
            >
              {/* Corner markings */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-brand-blue"></div>
              <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-brand-blue"></div>
              
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center mx-auto text-xl mb-1 select-none">
                  🔐
                </div>
                <h3 className="text-base font-black text-slate-900">لوحة الإدارة والاستعلام</h3>
                <p className="text-2xs text-slate-400 font-bold leading-relaxed">
                  الرجاء كتابة كلمة المرور المعتمدة للوصول لمفاتيح السجلات، وتعديل قائمة المحاضرين، وتحميل الأرشيف الكلي.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 block uppercase">كلمة المرور الحالية</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLoginSubmit();
                    }}
                    placeholder="أدخل كلمة المرور"
                    className="w-full text-slate-800 bg-slate-50 border border-brand-border focus:border-brand-blue focus:bg-white px-4 py-3 font-bold text-xs tracking-widest text-center outline-none rounded-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
                
                <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 p-2 flex items-center justify-between">
                  <span>💡 كلمة السر الافتراضية:</span>
                  <code className="font-mono font-black select-all bg-amber-100 py-0.5 px-1.5">admin2025</code>
                </div>
              </div>

              {loginError && (
                <p className="text-[10px] text-rose-600 bg-rose-50 border border-rose-200 p-2 font-bold flex items-center gap-1 justify-center">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{loginError}</span>
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleLoginSubmit}
                  className="flex-1 bg-brand-dark hover:bg-brand-blue text-white py-3 px-4 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer text-center rounded-none"
                >
                  تأكيد الدخول
                </button>
                <button
                  onClick={() => setShowLoginOverlay(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 py-3 px-4 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer text-center rounded-none"
                >
                  إلغاء
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
