import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getProjectById, saveProjectMeasurements } from "../services/api";
import { MEASUREMENT_FIELDS } from "../constants/measurementFields";

import FabricGrid from "../components/planner/FabricGrid";
import FabricStats from "../components/planner/FabricStats";
import PieceLibrary from "../components/planner/PieceLibrary";
import FabricHeader from "../components/planner/FabricHeader";

export default function GarmentPlanningPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [measurements, setMeasurements] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [hydrated, setHydrated] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) return navigate("/login", { replace: true });

        const project = await getProjectById(token, id);

        if (!project?.measurements_completed) {
          return navigate(`/project/${id}/setup`, { replace: true });
        }

        const initial = {};
        for (const f of MEASUREMENT_FIELDS) {
          initial[f.key] = project?.[f.key] ?? null;
        }

        setMeasurements(initial);
        setHydrated(true);
        setHasChanges(false);
      } catch (err) {
        console.error("Failed to load planning measurements", err);
      }
    })();
  }, [id, navigate]);

  useEffect(() => {
    if (!hydrated || !hasChanges) return;

    const t = setTimeout(async () => {
      try {
        setSaveState("saving");
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("No auth token");

        const payload = {};
        for (const f of MEASUREMENT_FIELDS) {
          const raw = measurements[f.key];
          if (raw === "" || raw === null || raw === undefined) {
            payload[f.key] = null;
          } else {
            const num = Number(raw);
            payload[f.key] = Number.isNaN(num) ? null : num;
          }
        }

        await saveProjectMeasurements(token, id, payload);
        setSaveState("saved");
        setHasChanges(false);
      } catch (err) {
        console.error("Autosave failed", err);
        setSaveState("error");
      }
    }, 800);

    return () => clearTimeout(t);
  }, [measurements, hydrated, hasChanges, id]);

  const statusText =
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved"
      ? "Saved"
      : saveState === "error"
      ? "Save failed"
      : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Thin save-status bar — only visible while saving/saved/error */}
      {statusText && (
        <div
          style={{
            padding: "5px 16px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            fontSize: "0.78rem",
            color: "#64748b",
            flexShrink: 0,
          }}
        >
          {statusText}
        </div>
      )}

      {/* Measurement cards strip at the top */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #e2e8f0",
          background: "#ffffff",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#94a3b8",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          Measurements
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "8px",
          }}
        >
          {MEASUREMENT_FIELDS.map((f) => {
            const val = measurements[f.key];
            const isEditing = editingKey === f.key;

            return (
              <div
                key={f.key}
                onClick={() => setEditingKey(f.key)}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  background: "#f8fafc",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{f.label}</div>

                {isEditing ? (
                  <input
                    autoFocus
                    type="number"
                    step="0.01"
                    value={val ?? ""}
                    onChange={(e) => {
                      const next = e.target.value;
                      setMeasurements((prev) => ({ ...prev, [f.key]: next }));
                      setHasChanges(true);
                      setSaveState("idle");
                    }}
                    onBlur={() => setEditingKey(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setEditingKey(null);
                    }}
                    style={{ marginTop: "4px", width: "100%", fontSize: "0.9rem" }}
                  />
                ) : (
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "#1e293b",
                    }}
                  >
                    {val ?? "--"} {f.unit}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-panel workspace: Pattern Tools | Canvas */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: Pattern Tools panel */}
        <div style={{ width: "290px", flexShrink: 0, overflow: "hidden" }}>
          <PieceLibrary />
        </div>

        {/* Right: Fabric canvas */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <FabricHeader />
          <div style={{ flex: 1, overflow: "auto" }}>
            <FabricGrid />
          </div>
        </div>
      </div>

      {/* Fabric Required stats strip at bottom */}
      <div
        style={{
          padding: "0 20px 16px",
          background: "#f1f5f9",
          borderTop: "1px solid #e2e8f0",
          flexShrink: 0,
        }}
      >
        <FabricStats />
      </div>
    </div>
  );
}
