import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { getProfile, updateProfile, getProjects } from "../services/api";

export default function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ user_name: "", bio: "" });
  const [previewPic, setPreviewPic] = useState(null);
  const [picFile, setPicFile] = useState(null);

  async function getToken() {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) { navigate("/login", { replace: true }); return null; }
    return firebaseUser.getIdToken();
  }

  async function loadData() {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const [prof, proj] = await Promise.all([getProfile(token), getProjects(token)]);
      setProfile(prof);
      setProjects(proj || []);
      setForm({ user_name: prof?.user_name ?? "", bio: prof?.bio ?? "" });
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2MB.");
      return;
    }
    setPicFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewPic(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    try {
      setSaving(true);
      const token = await getToken();
      if (!token) return;

      const payload = {
        user_name: form.user_name.trim(),
        bio: form.bio.trim(),
      };

      if (picFile) {
        payload.profile_picture = previewPic;
      }

      await updateProfile(token, payload);
      await loadData();
      setEditing(false);
      setPreviewPic(null);
      setPicFile(null);
    } catch (err) {
      console.error("Failed to save profile", err);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditing(false);
    setPreviewPic(null);
    setPicFile(null);
    setForm({ user_name: profile?.user_name ?? "", bio: profile?.bio ?? "" });
  }

  function getInitials(name, email) {
    if (name) return name.slice(0, 2).toUpperCase();
    if (email) return email.slice(0, 2).toUpperCase();
    return "?";
  }

  const avatarSrc = previewPic || profile?.profile_picture;

  if (loading) {
    return <div style={{ padding: "40px 32px", color: "#64748b", fontSize: "0.875rem" }}>Loading profile...</div>;
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px", color: "#1e293b" }}>

      {/* Profile card */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        border: "1px solid #e2e8f0",
        padding: "36px 32px",
        marginBottom: 24,
      }}>
        {/* Avatar + info row */}
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 24 }}>

          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              fontWeight: 700,
              color: "#fff",
              overflow: "hidden",
              border: "3px solid #ede9fe",
            }}>
              {avatarSrc
                ? <img src={avatarSrc} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : getInitials(profile?.user_name, profile?.user_email)
              }
            </div>
            {editing && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "2px solid #fff",
                    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    color: "#fff",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✎
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </>
            )}
          </div>

          {/* Name + email + stats */}
          <div style={{ flex: 1 }}>
            {editing ? (
              <input
                value={form.user_name}
                onChange={(e) => setForm((p) => ({ ...p, user_name: e.target.value }))}
                placeholder="Display name"
                style={inputStyle}
              />
            ) : (
              <h1 style={{ margin: "0 0 4px", fontSize: "1.4rem", fontWeight: 700 }}>
                {profile?.user_name || "No name set"}
              </h1>
            )}
            <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{projects.length}</div>
                <div style={{ color: "#64748b", fontSize: "0.72rem" }}>Projects</div>
              </div>
            </div>
          </div>

          {/* Edit button */}
          {!editing && (
            <button onClick={() => setEditing(true)} style={editBtnStyle}>
              Edit Profile
            </button>
          )}
        </div>

        {/* Bio */}
        {editing ? (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: "0.78rem", color: "#64748b", display: "block", marginBottom: 4 }}>Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              maxLength={200}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", textAlign: "right" }}>
              {form.bio.length}/200
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, color: profile?.bio ? "#475569" : "#94a3b8", fontSize: "0.875rem", fontStyle: profile?.bio ? "normal" : "italic" }}>
            {profile?.bio || "No bio yet."}
          </p>
        )}

        {/* Save / Cancel */}
        {editing && (
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={handleCancel} style={cancelBtnStyle}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={saveBtnStyle}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Projects section */}
      <div>
        <h2 style={{ margin: "0 0 14px", fontSize: "1rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          My Projects
        </h2>
        {projects.length === 0 ? (
          <div style={{
            border: "2px dashed #cbd5e1",
            borderRadius: 14,
            padding: 32,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: "0.875rem",
          }}>
            No projects yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/project/${p.id}/planning`)}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: "18px 16px",
                  cursor: "pointer",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#c4b5fd";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(109,40,217,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  marginBottom: 10,
                }}>
                  ✂
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1e293b", marginBottom: 4 }}>
                  {p.name}
                </div>
                {p.description && (
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#1e293b",
  fontSize: "0.875rem",
  boxSizing: "border-box",
};

const editBtnStyle = {
  padding: "8px 18px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f1f5f9",
  color: "#475569",
  fontWeight: 600,
  fontSize: "0.82rem",
  cursor: "pointer",
  flexShrink: 0,
};

const saveBtnStyle = {
  padding: "8px 20px",
  borderRadius: 8,
  border: "none",
  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.875rem",
  cursor: "pointer",
};

const cancelBtnStyle = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f1f5f9",
  color: "#64748b",
  fontSize: "0.875rem",
  cursor: "pointer",
};
