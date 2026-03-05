"use client";
import { useState, useRef, useCallback } from "react";

// ─── MOCK PO DATA (simulates StrategicERP API response) ───
const MOCK_POS = [
  {
    po_number: "NCPLPO2026020278",
    supplier: "Ultratech Cement Ltd",
    material: "OPC 53 Grade Cement",
    rate: 5762.71,
    rate_unit: "TON",
    total_qty: 100,
    received_qty: 62.3,
    balance_qty: 37.7,
    hsn: "25232910",
    gst: 18,
    site: "Devgad RMC Plant",
    tolerance: 2,
  },
  {
    po_number: "NCPLPO2026020291",
    supplier: "ACC Cement Ltd",
    material: "PPC Cement",
    rate: 5420.0,
    rate_unit: "TON",
    total_qty: 80,
    received_qty: 28.0,
    balance_qty: 52.0,
    hsn: "25232910",
    gst: 18,
    site: "Jambhulwadi RMC Plant",
    tolerance: 2,
  },
  {
    po_number: "NCPLPO2026020305",
    supplier: "Mahalaxmi Aggregates",
    material: "20mm Aggregate",
    rate: 820.0,
    rate_unit: "TON",
    total_qty: 500,
    received_qty: 340.0,
    balance_qty: 160.0,
    hsn: "25171010",
    gst: 5,
    site: "Devgad RMC Plant",
    tolerance: 3,
  },
  {
    po_number: "NCPLPO2026020312",
    supplier: "Konkan Sand Suppliers",
    material: "M-Sand (Crushed Sand)",
    rate: 1150.0,
    rate_unit: "TON",
    total_qty: 300,
    received_qty: 120.0,
    balance_qty: 180.0,
    hsn: "25171020",
    gst: 5,
    site: "Devgad RMC Plant",
    tolerance: 3,
  },
];

// ─── FIELD CONFIG ───
const FIELD_CONFIG = [
  { key: "dc_number", label: "DC / Challan No.", icon: "📄", group: "challan" },
  { key: "dc_date", label: "Challan Date", icon: "📅", group: "challan" },
  { key: "supplier_name", label: "Supplier Name", icon: "🏭", group: "challan" },
  { key: "material_description", label: "Material", icon: "🧱", group: "challan" },
  { key: "quantity", label: "Quantity", icon: "⚖️", group: "challan" },
  { key: "quantity_unit", label: "Unit", icon: "📏", group: "challan" },
  { key: "vehicle_number", label: "Vehicle No.", icon: "🚛", group: "challan" },
  { key: "lr_number", label: "LR Number", icon: "📋", group: "challan" },
  { key: "driver_name", label: "Driver Name", icon: "👤", group: "challan" },
  { key: "delivery_site", label: "Delivery Site", icon: "📍", group: "challan" },
  { key: "gross_weight", label: "Gross Weight", icon: "⬆️", group: "weight" },
  { key: "tare_weight", label: "Tare Weight", icon: "⬇️", group: "weight" },
  { key: "net_weight", label: "Net Weight", icon: "🎯", group: "weight" },
];

// ─── ICONS (inline SVG) ───
function CameraIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function CheckIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowLeftIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function UploadIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

// ─── CONFIDENCE BADGE ───
function ConfBadge({ level }) {
  const colors = { high: "#22C55E", medium: "#F59E0B", low: "#EF4444" };
  const color = colors[level] || colors.medium;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: color,
        background: `${color}18`,
        padding: "2px 8px",
        borderRadius: 4,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {level}
    </span>
  );
}

// ─── MAIN APP ───
export default function GRNScanner() {
  const [step, setStep] = useState("capture"); // capture | processing | review | po_match | confirm
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [editedFields, setEditedFields] = useState({});
  const [matchedPO, setMatchedPO] = useState(null);
  const [error, setError] = useState(null);
  const [weighbridge, setWeighbridge] = useState("");
  const [grnNumber, setGrnNumber] = useState(null);
  const fileInputRef = useRef(null);

  // ─── COMPRESS IMAGE ───
const compressImage = (dataUrl, maxWidth = 1600, quality = 0.7) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      
      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed);
    };
    img.src = dataUrl;
  });
};
  
  // ─── HANDLE IMAGE CAPTURE ───
  
  const handleCapture = useCallback((e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const originalKB = Math.round(file.size / 1024);
  setError(`Original file: ${originalKB} KB. Compressing...`);

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX = 800;
      let w = img.width, h = img.height;
      if (w > MAX) { h = (h * MAX) / w; w = MAX; }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL("image/jpeg", 0.7);
      const base64 = compressed.split(",")[1];
      const compressedKB = Math.round(base64.length * 0.75 / 1024);

      setError(`Original: ${originalKB} KB → Compressed: ${compressedKB} KB (${w}x${Math.round(h)}px). Sending...`);

      setImage(base64);
      setImagePreview(compressed);
      processImage(base64, "image/jpeg");
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}, []);
  
  
  // ─── PROCESS IMAGE ───
  const processImage = async (base64Image, mimeType) => {
    setStep("processing");
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image, mimeType }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Extraction failed");
      }

      const { data } = await res.json();
      setExtracted(data);

      // Initialize edited fields with extracted values
      const initial = {};
      if (data.fields) {
        Object.entries(data.fields).forEach(([key, val]) => {
          initial[key] = val?.value || "";
        });
      }
      setEditedFields(initial);

      // Try auto-matching PO
      const supplierMatch = (initial.supplier_name || "").toLowerCase();
      const materialMatch = (initial.material_description || "").toLowerCase();
      const autoMatch = MOCK_POS.find(
        (po) =>
          po.supplier.toLowerCase().includes(supplierMatch.split(" ")[0]) ||
          supplierMatch.includes(po.supplier.toLowerCase().split(" ")[0])
      );
      if (autoMatch) setMatchedPO(autoMatch);

      setStep("review");
    } catch (err) {
      setError(err.message);
      setStep("capture");
    }
  };

  // ─── FIELD UPDATE ───
  const updateField = (key, value) => {
    setEditedFields((prev) => ({ ...prev, [key]: value }));
  };

  // ─── PO SELECTION ───
  const selectPO = (po) => {
    setMatchedPO(po);
    setStep("review");
  };

  // ─── SUBMIT GRN ───
  const submitGRN = () => {
    const now = new Date();
    const grn = `NCPL/RPPDGRN${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(Math.floor(Math.random() * 900) + 100)}`;
    setGrnNumber(grn);
    setStep("confirm");
  };

  // ─── RESET ───
  const reset = () => {
    setStep("capture");
    setImage(null);
    setImagePreview(null);
    setExtracted(null);
    setEditedFields({});
    setMatchedPO(null);
    setError(null);
    setWeighbridge("");
    setGrnNumber(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── STYLES ───
  const s = {
    container: {
      maxWidth: 480,
      margin: "0 auto",
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      padding: "16px 20px",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "var(--bg-secondary)",
      position: "sticky",
      top: 0,
      zIndex: 10,
    },
    logo: {
      fontSize: 15,
      fontWeight: 700,
      color: "var(--accent)",
      letterSpacing: "-0.02em",
    },
    logoSub: {
      fontSize: 11,
      color: "var(--text-muted)",
      fontWeight: 400,
    },
    backBtn: {
      background: "none",
      border: "none",
      color: "var(--text-secondary)",
      cursor: "pointer",
      padding: 4,
      display: "flex",
    },
    body: {
      flex: 1,
      padding: "20px",
      overflowY: "auto",
    },
    // Capture screen
    captureZone: {
      border: "2px dashed var(--border)",
      borderRadius: 16,
      padding: "48px 24px",
      textAlign: "center",
      cursor: "pointer",
      transition: "all 0.2s",
      background: "var(--bg-card)",
    },
    captureTitle: {
      fontSize: 18,
      fontWeight: 600,
      marginTop: 16,
      color: "var(--text-primary)",
    },
    captureSub: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginTop: 8,
      lineHeight: 1.5,
    },
    // Processing
    processingWrap: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      gap: 24,
      padding: "40px 20px",
    },
    scanBox: {
      width: 200,
      height: 140,
      borderRadius: 12,
      overflow: "hidden",
      position: "relative",
      border: "2px solid var(--accent)",
    },
    scanLine: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 2,
      background: "var(--accent)",
      boxShadow: "0 0 12px var(--accent)",
      animation: "scan-line 2s ease-in-out infinite",
    },
    // Card
    card: {
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      marginBottom: 12,
    },
    // Field row
    fieldRow: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      padding: "10px 0",
      borderBottom: "1px solid var(--border)",
    },
    fieldLabel: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 12,
      color: "var(--text-muted)",
      fontWeight: 500,
    },
    fieldInput: {
      width: "100%",
      background: "var(--bg-input)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "10px 12px",
      color: "var(--text-primary)",
      fontSize: 15,
      fontFamily: "'DM Sans', sans-serif",
      outline: "none",
      transition: "border-color 0.2s",
    },
    // PO card
    poCard: {
      background: "var(--bg-card)",
      border: "2px solid var(--border)",
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      cursor: "pointer",
      transition: "all 0.2s",
    },
    poCardSelected: {
      borderColor: "var(--accent)",
      background: "var(--accent-glow)",
    },
    poNumber: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 14,
      color: "var(--accent)",
      fontWeight: 500,
    },
    poDetail: {
      fontSize: 13,
      color: "var(--text-secondary)",
      marginTop: 4,
    },
    poBalance: {
      display: "inline-block",
      marginTop: 8,
      fontSize: 12,
      fontWeight: 600,
      color: "var(--warning)",
      background: "var(--warning-bg)",
      padding: "3px 10px",
      borderRadius: 6,
    },
    // Buttons
    primaryBtn: {
      width: "100%",
      padding: "16px",
      background: "var(--accent)",
      color: "#0F172A",
      fontSize: 15,
      fontWeight: 700,
      border: "none",
      borderRadius: 12,
      cursor: "pointer",
      fontFamily: "'DM Sans', sans-serif",
      letterSpacing: "-0.01em",
      transition: "all 0.2s",
    },
    secondaryBtn: {
      width: "100%",
      padding: "14px",
      background: "transparent",
      color: "var(--text-secondary)",
      fontSize: 14,
      fontWeight: 500,
      border: "1px solid var(--border)",
      borderRadius: 12,
      cursor: "pointer",
      fontFamily: "'DM Sans', sans-serif",
      marginTop: 8,
    },
    // Meta badges
    metaBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 500,
      background: "var(--bg-secondary)",
      color: "var(--text-secondary)",
      marginRight: 8,
      marginBottom: 8,
    },
    // Confirmation
    confirmCheck: {
      width: 64,
      height: 64,
      borderRadius: "50%",
      background: "var(--success-bg)",
      border: "2px solid var(--success)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 16px",
      color: "var(--success)",
    },
    confirmTitle: {
      fontSize: 20,
      fontWeight: 700,
      textAlign: "center",
      marginBottom: 8,
    },
    confirmGRN: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 16,
      color: "var(--accent)",
      textAlign: "center",
      marginBottom: 24,
    },
    summaryRow: {
      display: "flex",
      justifyContent: "space-between",
      padding: "10px 0",
      borderBottom: "1px solid var(--border)",
      fontSize: 14,
    },
    summaryLabel: {
      color: "var(--text-muted)",
    },
    summaryValue: {
      color: "var(--text-primary)",
      fontWeight: 500,
      textAlign: "right",
    },
    // Error
    errorBox: {
      background: "var(--error-bg)",
      border: "1px solid var(--error)",
      borderRadius: 10,
      padding: 16,
      marginBottom: 16,
      fontSize: 14,
      color: "var(--error)",
    },
    // Preview image
    previewImg: {
      width: "100%",
      borderRadius: 10,
      marginBottom: 16,
      maxHeight: 200,
      objectFit: "cover",
    },
    // Weighbridge input section
    weighbridgeSection: {
      background: "var(--warning-bg)",
      border: "1px solid rgba(245, 158, 11, 0.3)",
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    footer: {
      padding: "16px 20px",
      borderTop: "1px solid var(--border)",
      background: "var(--bg-secondary)",
      position: "sticky",
      bottom: 0,
    },
  };

  // ─── RENDER: CAPTURE SCREEN ───
  if (step === "capture") {
    return (
      <div style={s.container}>
        <header style={s.header}>
          <div>
            <div style={s.logo}>
              GrokIT <span style={{ color: "var(--text-primary)", fontWeight: 400 }}>GRN Scanner</span>
            </div>
            <div style={s.logoSub}>Intelligent Document Capture for Construction</div>
          </div>
        </header>

        <div style={{ ...s.body, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {error && (
            <div style={s.errorBox} className="fade-up">
              {error}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCapture}
            style={{ display: "none" }}
            id="challan-input"
          />

          <label htmlFor="challan-input" style={s.captureZone} className="fade-up">
            <UploadIcon />
            <div style={s.captureTitle}>Scan Delivery Challan</div>
            <div style={s.captureSub}>
              Photograph the challan using your phone camera.
              <br />
              AI will extract all fields automatically.
            </div>
          </label>

          <div style={{ marginTop: 32 }} className="fade-up fade-up-delay-2">
            <div style={{ ...s.cardTitle, marginBottom: 16, textAlign: "center" }}>How it works</div>
            <div style={{ display: "flex", gap: 12 }}>
              {[
                { num: "1", text: "Photograph the challan" },
                { num: "2", text: "AI extracts all fields" },
                { num: "3", text: "Review & confirm GRN" },
              ].map((item) => (
                <div
                  key={item.num}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "16px 8px",
                    background: "var(--bg-card)",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--accent-glow)",
                      border: "1px solid var(--accent)",
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 8px",
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {item.num}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>{item.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Demo: upload from gallery option */}
          <div style={{ textAlign: "center", marginTop: 24 }} className="fade-up fade-up-delay-3">
            <label
              style={{
                fontSize: 13,
                color: "var(--accent)",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleCapture}
                style={{ display: "none" }}
              />
              or upload from gallery for demo
            </label>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: PROCESSING ───
  if (step === "processing") {
    return (
      <div style={s.container}>
        <header style={s.header}>
          <div>
            <div style={s.logo}>
              GrokIT <span style={{ color: "var(--text-primary)", fontWeight: 400 }}>GRN Scanner</span>
            </div>
          </div>
        </header>
        <div style={s.processingWrap}>
          <div style={s.scanBox}>
            {imagePreview && (
              <img src={imagePreview} alt="Scanning" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
            )}
            <div style={s.scanLine} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Analyzing Challan...</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              AI is reading the document,
              <br />
              extracting fields, and matching to PO
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  opacity: 0.4,
                  animation: `pulse-ring 1.2s ease-in-out ${i * 0.3}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: REVIEW EXTRACTED FIELDS ───
  if (step === "review") {
    const challanFields = FIELD_CONFIG.filter((f) => f.group === "challan");
    const weightFields = FIELD_CONFIG.filter((f) => f.group === "weight");

    return (
      <div style={s.container}>
        <header style={s.header}>
          <button style={s.backBtn} onClick={reset}>
            <ArrowLeftIcon />
          </button>
          <div>
            <div style={s.logo}>Review GRN</div>
            <div style={s.logoSub}>Verify extracted data before submission</div>
          </div>
        </header>

        <div style={s.body}>
          {/* Challan preview */}
          {imagePreview && <img src={imagePreview} alt="Challan" style={s.previewImg} className="fade-up" />}

          {/* Document meta */}
          {extracted && (
            <div style={{ marginBottom: 16 }} className="fade-up fade-up-delay-1">
              <span style={s.metaBadge}>
                📑 {extracted.document_type?.replace("_", " ") || "document"}
              </span>
              <span style={s.metaBadge}>
                🌐 {extracted.language_detected || "unknown"}
              </span>
              <span style={s.metaBadge}>
                📷 Quality: {extracted.overall_quality || "—"}
              </span>
            </div>
          )}

          {/* Challan fields */}
          <div style={s.card} className="fade-up fade-up-delay-2">
            <div style={s.cardTitle}>Challan Details (AI Extracted)</div>
            {challanFields.map((field) => {
              const raw = extracted?.fields?.[field.key];
              return (
                <div key={field.key} style={s.fieldRow}>
                  <div style={s.fieldLabel}>
                    <span>{field.icon}</span>
                    <span>{field.label}</span>
                    {raw?.confidence && <ConfBadge level={raw.confidence} />}
                  </div>
                  <input
                    style={{
                      ...s.fieldInput,
                      borderColor: raw?.confidence === "low" ? "var(--error)" : "var(--border)",
                    }}
                    value={editedFields[field.key] || ""}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.target.style.borderColor = raw?.confidence === "low" ? "var(--error)" : "var(--border)")}
                  />
                </div>
              );
            })}
          </div>

          {/* Weight fields from challan */}
          <div style={s.card} className="fade-up fade-up-delay-3">
            <div style={s.cardTitle}>Weight Data (from Challan)</div>
            {weightFields.map((field) => {
              const raw = extracted?.fields?.[field.key];
              return (
                <div key={field.key} style={s.fieldRow}>
                  <div style={s.fieldLabel}>
                    <span>{field.icon}</span>
                    <span>{field.label}</span>
                    {raw?.confidence && <ConfBadge level={raw.confidence} />}
                  </div>
                  <input
                    style={s.fieldInput}
                    value={editedFields[field.key] || ""}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder="Not on challan"
                    onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>
              );
            })}
          </div>

          {/* Weighbridge manual entry */}
          <div style={s.weighbridgeSection} className="fade-up fade-up-delay-4">
            <div style={{ ...s.cardTitle, color: "var(--warning)" }}>⚖️ Weighbridge Reading (Manual)</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
              Enter actual weighbridge net weight for quantity verification
            </div>
            <input
              style={{ ...s.fieldInput, borderColor: "rgba(245, 158, 11, 0.3)" }}
              value={weighbridge}
              onChange={(e) => setWeighbridge(e.target.value)}
              placeholder="e.g. 28.35 MT"
              onFocus={(e) => (e.target.style.borderColor = "var(--warning)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(245, 158, 11, 0.3)")}
            />
            {weighbridge && editedFields.quantity && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  color:
                    Math.abs(parseFloat(weighbridge) - parseFloat(editedFields.quantity)) /
                      parseFloat(editedFields.quantity) >
                    0.02
                      ? "var(--error)"
                      : "var(--success)",
                }}
              >
                {(() => {
                  const wb = parseFloat(weighbridge);
                  const ch = parseFloat(editedFields.quantity);
                  if (isNaN(wb) || isNaN(ch)) return "";
                  const diff = wb - ch;
                  const pct = ((diff / ch) * 100).toFixed(1);
                  if (Math.abs(diff) < 0.01) return "✓ Exact match with challan";
                  return `${diff > 0 ? "+" : ""}${diff.toFixed(2)} MT (${pct}%) vs challan qty`;
                })()}
              </div>
            )}
          </div>

          {/* PO Match */}
          <div style={s.card} className="fade-up fade-up-delay-5">
            <div style={s.cardTitle}>📦 Matched Purchase Order</div>
            {matchedPO ? (
              <div>
                <div
                  style={{
                    ...s.poCard,
                    ...s.poCardSelected,
                    marginBottom: 8,
                    cursor: "default",
                  }}
                >
                  <div style={s.poNumber}>{matchedPO.po_number}</div>
                  <div style={s.poDetail}>
                    {matchedPO.material} — ₹{matchedPO.rate.toLocaleString()}/{matchedPO.rate_unit}
                  </div>
                  <div style={s.poDetail}>{matchedPO.site}</div>
                  <div style={s.poBalance}>
                    Balance: {matchedPO.balance_qty} {matchedPO.rate_unit} remaining
                  </div>
                </div>
                <button
                  style={{
                    ...s.secondaryBtn,
                    marginTop: 0,
                    padding: "10px",
                    fontSize: 13,
                  }}
                  onClick={() => setStep("po_match")}
                >
                  Change PO Match
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>
                  No auto-match found. Select PO manually:
                </div>
                <button
                  style={{ ...s.primaryBtn, padding: "12px", fontSize: 14 }}
                  onClick={() => setStep("po_match")}
                >
                  Select Purchase Order
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit footer */}
        <div style={s.footer}>
          <button
            style={{
              ...s.primaryBtn,
              opacity: matchedPO ? 1 : 0.4,
              pointerEvents: matchedPO ? "auto" : "none",
            }}
            onClick={submitGRN}
          >
            ✓ Create GRN in StrategicERP
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: PO SELECTION ───
  if (step === "po_match") {
    return (
      <div style={s.container}>
        <header style={s.header}>
          <button style={s.backBtn} onClick={() => setStep("review")}>
            <ArrowLeftIcon />
          </button>
          <div>
            <div style={s.logo}>Select Purchase Order</div>
            <div style={s.logoSub}>Match this delivery to an open PO</div>
          </div>
        </header>
        <div style={s.body}>
          {MOCK_POS.map((po, i) => (
            <div
              key={po.po_number}
              style={{
                ...s.poCard,
                ...(matchedPO?.po_number === po.po_number ? s.poCardSelected : {}),
              }}
              className={`fade-up fade-up-delay-${i + 1}`}
              onClick={() => selectPO(po)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={s.poNumber}>{po.po_number}</div>
                  <div style={s.poDetail}>{po.supplier}</div>
                  <div style={s.poDetail}>
                    {po.material} — ₹{po.rate.toLocaleString()}/{po.rate_unit}
                  </div>
                </div>
                {matchedPO?.po_number === po.po_number && (
                  <div
                    style={{
                      color: "var(--accent)",
                      background: "var(--accent-glow)",
                      borderRadius: "50%",
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CheckIcon size={16} />
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <span style={s.poBalance}>Balance: {po.balance_qty} {po.rate_unit}</span>
                <span style={{ ...s.metaBadge, margin: 0 }}>📍 {po.site}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── RENDER: CONFIRMATION ───
  if (step === "confirm") {
    const qty = parseFloat(editedFields.quantity) || 0;
    const rate = matchedPO?.rate || 0;
    const taxable = qty * rate;
    const gst = taxable * (matchedPO?.gst || 18) / 100;
    const total = taxable + gst;
    const now = new Date();

    return (
      <div style={s.container}>
        <header style={s.header}>
          <div>
            <div style={s.logo}>
              GrokIT <span style={{ color: "var(--text-primary)", fontWeight: 400 }}>GRN Scanner</span>
            </div>
          </div>
        </header>
        <div style={s.body}>
          <div style={s.confirmCheck} className="fade-up">
            <CheckIcon size={32} />
          </div>
          <div style={s.confirmTitle} className="fade-up fade-up-delay-1">
            GRN Created Successfully
          </div>
          <div style={s.confirmGRN} className="fade-up fade-up-delay-1">
            {grnNumber}
          </div>

          <div style={s.card} className="fade-up fade-up-delay-2">
            <div style={s.cardTitle}>GRN Summary</div>
            {[
              ["GRN Number", grnNumber],
              ["PO Reference", matchedPO?.po_number],
              ["Supplier", editedFields.supplier_name],
              ["Material", editedFields.material_description],
              ["DC Number", editedFields.dc_number],
              ["Vehicle", editedFields.vehicle_number],
              ["Challan Qty", `${editedFields.quantity} ${editedFields.quantity_unit || "MT"}`],
              ["Weighbridge", weighbridge ? `${weighbridge} MT` : "—"],
              ["PO Rate", `₹${rate.toLocaleString()} / ${matchedPO?.rate_unit}`],
              ["Taxable Value", `₹${taxable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`],
              ["GST @ " + (matchedPO?.gst || 18) + "%", `₹${gst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`],
              ["Total Value", `₹${total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`],
              ["Site", matchedPO?.site],
              ["Entry Time", now.toLocaleString("en-IN")],
            ].map(([label, value]) => (
              <div key={label} style={s.summaryRow}>
                <span style={s.summaryLabel}>{label}</span>
                <span
                  style={{
                    ...s.summaryValue,
                    ...(label === "Total Value"
                      ? { color: "var(--accent)", fontSize: 16, fontWeight: 700 }
                      : {}),
                  }}
                >
                  {value || "—"}
                </span>
              </div>
            ))}
          </div>

          <div style={s.card} className="fade-up fade-up-delay-3">
            <div style={s.cardTitle}>PO Fulfilment Status</div>
            {(() => {
              const received = (matchedPO?.received_qty || 0) + qty;
              const totalQty = matchedPO?.total_qty || 100;
              const pct = Math.min(100, (received / totalQty) * 100);
              return (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: "var(--text-muted)" }}>
                      {received.toFixed(1)} / {totalQty} {matchedPO?.rate_unit}
                    </span>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>{pct.toFixed(0)}%</span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: "var(--bg-input)",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: pct >= 100 ? "var(--success)" : "var(--accent)",
                        borderRadius: 4,
                        transition: "width 1s ease-out",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                    Balance remaining: {Math.max(0, totalQty - received).toFixed(1)} {matchedPO?.rate_unit}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* WhatsApp notification mock */}
          <div
            style={{
              ...s.card,
              background: "rgba(34, 197, 94, 0.08)",
              borderColor: "rgba(34, 197, 94, 0.2)",
            }}
            className="fade-up fade-up-delay-4"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>💬</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--success)" }}>
                  WhatsApp Approval Sent
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Sent to Project In-Charge for approval with OTP verification
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={s.footer}>
          <button style={s.primaryBtn} onClick={reset}>
            <CameraIcon size={18} /> &nbsp; Scan Next Delivery
          </button>
          <button style={s.secondaryBtn} onClick={reset}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}
