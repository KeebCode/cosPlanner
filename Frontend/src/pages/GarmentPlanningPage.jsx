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
  const [editingKey, setEditingKey] = useState(null); // one card in edit mode
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [hydrated, setHydrated] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load project + guard setup completion
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

  // Debounced autosave
  useEffect(() => {
    if (!hydrated || !hasChanges) return;

    const t = setTimeout(async () => {
      try {
        setSaveState("saving");
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("No auth token");

        // Normalize values before save
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
    }, 800); // debounce delay

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
    <div>
      <h1>Garment Planning</h1>
      <p>Project ID: {id}</p>
      {statusText && <p style={{ opacity: 0.85 }}>{statusText}</p>}

      {/* Editable measurement cards (labels + unit only) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginTop: "16px",
          marginBottom: "20px",
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
                border: "1px solid #444",
                borderRadius: "10px",
                padding: "12px",
                background: "#161616",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>{f.label}</div>

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
                  style={{ marginTop: "8px", width: "100%" }}
                />
              ) : (
                <div style={{ marginTop: "8px", fontSize: "1.1rem" }}>
                  {val ?? "--"} {f.unit}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Existing planner components */}
      <PieceLibrary />
      <FabricHeader />
      <FabricGrid />
      <FabricStats />
    </div>
  );
}
