import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { saveProjectMeasurements } from "../services/api";
import { MEASUREMENT_FIELDS } from "../constants/measurementFields";

const STEPS = MEASUREMENT_FIELDS;

export default function ProjectSetupPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({});

  const current = STEPS[step];
  const key = current.key;
  const isLast = step === STEPS.length - 1;
  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  async function onNext() {
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }

    const payload = Object.fromEntries(
      MEASUREMENT_FIELDS.map((f) => {
        const raw = form[f.key];
        if (raw === "" || raw === undefined || raw === null) return [f.key, null];
        const n = Number(raw);
        return [f.key, Number.isNaN(n) ? null : n];
      })
    );

    const token = await getAuth().currentUser?.getIdToken();
    if (!token) {
      alert("You are not logged in. Please sign in again.");
      return;
    }

    await saveProjectMeasurements(token, id, payload);
    navigate(`/project/${id}/planning`);
  }

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        background: "#f1f5f9",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#ffffff",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* Card header */}
        <div
          style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            padding: "20px 28px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ color: "white", fontSize: "1.2rem" }}>✂</span>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>Project Setup</div>
            <div style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.75rem" }}>
              Step {step + 1} of {STEPS.length}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: "4px", background: "#e2e8f0" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #4f46e5, #7c3aed)",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Card body */}
        <div style={{ padding: "28px 28px 24px" }}>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#94a3b8",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            Measurement
          </div>
          <h2 style={{ margin: "0 0 6px", fontSize: "1.3rem", fontWeight: 700, color: "#1e293b" }}>
            {current.label}
          </h2>
          <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "0.875rem" }}>
            Enter value{current.unit ? ` in ${current.unit}` : ""}
          </p>

          <input
            type="number"
            step="0.01"
            value={form[key] ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, [key]: e.target.value }))
            }
            placeholder={`e.g. 36${current.unit ? ` ${current.unit}` : ""}`}
            onKeyDown={(e) => { if (e.key === "Enter") onNext(); }}
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              background: "#f8fafc",
              color: "#1e293b",
              fontSize: "1rem",
              boxSizing: "border-box",
              outline: "none",
              marginBottom: "20px",
            }}
          />

          <div style={{ display: "flex", gap: "10px" }}>
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "transparent",
                  color: "#64748b",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={onNext}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              {isLast ? "Finish ✓" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
