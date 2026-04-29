import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { saveProjectMeasurements } from "../services/api";
import { MEASUREMENT_FIELDS } from "../constants/measurementFields";

// Shared field config used for setup steps
const STEPS = MEASUREMENT_FIELDS;

export default function ProjectSetupPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({});

  // Current step object: { key, label, unit }
  const current = STEPS[step];
  const key = current.key;
  const isLast = step === STEPS.length - 1;

  async function onNext() {
    // Move to next step until final step
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }

    // Build normalized payload from shared keys
    // empty -> null, numeric strings -> Number
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
    <div className="fade-step">
      <h1>Project Setup</h1>
      <p>Enter your measurements for this project.</p>

      {/* Friendly label + unit hint */}
      <h2>{current.label}</h2>
      <p style={{ opacity: 0.8 }}>
        Enter value {current.unit ? `(${current.unit})` : ""}
      </p>

      <input
        type="number"
        step="0.01"
        value={form[key] ?? ""}
        onChange={(e) =>
          setForm((prev) => ({
            ...prev,
            // keep raw input while typing; normalize on submit
            [key]: e.target.value,
          }))
        }
      />

      <button onClick={onNext}>{isLast ? "Finish" : "Next"}</button>
    </div>
  );
}