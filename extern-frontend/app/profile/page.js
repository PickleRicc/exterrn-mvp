"use client";
import { useState, useEffect } from "react";
import { craftsmenAPI } from "../lib/api";
import AvailabilityEditor from "../components/AvailabilityEditor";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ old: "", new1: "", new2: "" });

  // Fetch user from JWT/localStorage and backend
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    let craftsmanId = null;
    try {
      const tokenData = JSON.parse(atob(token.split(".")[1]));
      craftsmanId = tokenData.craftsmanId;
    } catch (err) {
      localStorage.removeItem("token");
      window.location.href = "/auth/login";
      return;
    }
    craftsmenAPI.getById(craftsmanId).then((data) => {
      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
        logo: data.logo_url || null,
        availability: data.availability_hours || {
          monday: ["9:00-17:00"],
          tuesday: ["9:00-17:00"],
          wednesday: ["9:00-17:00"],
          thursday: ["9:00-17:00"],
          friday: ["9:00-17:00"],
          saturday: [],
          sunday: []
        }
      });
    }).catch(() => {
      setError("Fehler beim Laden des Profils.");
    });
  }, []);

  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUser((u) => ({ ...u, logo: URL.createObjectURL(e.target.files[0]) }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await craftsmenAPI.update(user.id, {
        name: user.name,
        logo_url: user.logo, // TODO: handle real upload
        availability_hours: user.availability
      });
      setSuccess("Profil erfolgreich gespeichert.");
      setEditing(false);
    } catch (err) {
      setError("Fehler beim Speichern des Profils.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (passwords.new1 !== passwords.new2) {
      setError("Die neuen Passwörter stimmen nicht überein.");
      return;
    }
    try {
      // Call backend endpoint for password update (implement in backend if missing)
      await fetch("/api/proxy/auth/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          oldPassword: passwords.old,
          newPassword: passwords.new1
        })
      });
      setSuccess("Passwort erfolgreich geändert.");
      setShowPasswordModal(false);
      setPasswords({ old: "", new1: "", new2: "" });
    } catch (err) {
      setError("Fehler beim Ändern des Passworts.");
    }
  };

  if (!user) {
    return <div className="p-8 text-center text-gray-500">Lade Profil...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1929] to-[#132f4c]">
      <main className="flex-grow container mx-auto px-5 py-8 max-w-md animate-fade-in">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl shadow-lg border border-white/10 p-6">
          <h1 className="text-2xl font-bold mb-6 text-center">
            <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">Profil</span>
          </h1>
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 mb-2 rounded-full bg-[#0070f3]/10 flex items-center justify-center overflow-hidden border-2 border-[#0070f3]">
              {user.logo ? (
                <img src={user.logo} alt="Logo" className="object-cover w-full h-full" />
              ) : (
                <span className="text-4xl text-[#0070f3]">👤</span>
              )}
            </div>
            {editing && (
              <label className="text-xs text-[#0070f3] cursor-pointer hover:underline">
                Logo ändern
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-white/80">Name</label>
            <input
              className="w-full border border-white/10 rounded px-3 py-2 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-[#0070f3]/50 focus:border-[#0070f3]/50 appearance-none"
              value={user.name}
              disabled={!editing}
              onChange={e => setUser({ ...user, name: e.target.value })}
              placeholder="Name"
              autoComplete="off"
              style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-white/80">E-Mail</label>
            <input
              className="w-full border border-white/10 rounded px-3 py-2 bg-white/10 text-white placeholder-white/70 appearance-none"
              value={user.email}
              disabled
              placeholder="E-Mail"
              autoComplete="off"
              style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-white/80">Verfügbarkeit</label>
            <AvailabilityEditor
              value={user.availability}
              onChange={avail => setUser({ ...user, availability: avail })}
              disabled={!editing}
              inputClassName="bg-white/10 text-white placeholder-white/70 border-white/10 appearance-none"
              inputStyle={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
            />
          </div>
          {(error || success) && (
            <div className={`mb-4 text-center ${error ? "text-red-500" : "text-green-500"}`}>{error || success}</div>
          )}
          <div className="mb-6">
            {editing ? (
              <button
                className="w-full py-2 px-4 bg-gradient-to-r from-[#0070f3] to-[#0050d3] text-white rounded font-semibold mb-2 shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Speichern..." : "Speichern"}
              </button>
            ) : (
              <button
                className="w-full py-2 px-4 bg-gradient-to-r from-[#0070f3] to-[#0050d3] text-white rounded font-semibold mb-2 shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => setEditing(true)}
              >
                Bearbeiten
              </button>
            )}
            <button
              className="w-full py-2 px-4 bg-white/5 text-white rounded font-semibold border border-white/10 mt-1 hover:bg-white/10"
              onClick={() => setShowPasswordModal(true)}
            >
              Passwort ändern
            </button>
          </div>
          {/* Password modal */}
          {showPasswordModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
              <div className="bg-white/5 rounded-lg shadow-lg p-6 w-full max-w-sm border border-white/10">
                <h2 className="text-lg font-bold mb-4 text-[#0070f3]">Passwort ändern</h2>
                <form onSubmit={handlePasswordChange}>
                  <input
                    className="w-full border border-white/10 rounded px-3 py-2 mb-2 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-[#0070f3]/50 focus:border-[#0070f3]/50 appearance-none"
                    type="password"
                    placeholder="Altes Passwort"
                    value={passwords.old}
                    onChange={e => setPasswords({ ...passwords, old: e.target.value })}
                    required
                    style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                  />
                  <input
                    className="w-full border border-white/10 rounded px-3 py-2 mb-2 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-[#0070f3]/50 focus:border-[#0070f3]/50 appearance-none"
                    type="password"
                    placeholder="Neues Passwort"
                    value={passwords.new1}
                    onChange={e => setPasswords({ ...passwords, new1: e.target.value })}
                    required
                    style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                  />
                  <input
                    className="w-full border border-white/10 rounded px-3 py-2 mb-4 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-[#0070f3]/50 focus:border-[#0070f3]/50 appearance-none"
                    type="password"
                    placeholder="Neues Passwort wiederholen"
                    value={passwords.new2}
                    onChange={e => setPasswords({ ...passwords, new2: e.target.value })}
                    required
                    style={{ WebkitTextFillColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' }}
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-2 px-4 bg-gradient-to-r from-[#0070f3] to-[#0050d3] text-white rounded font-semibold">Speichern</button>
                    <button type="button" className="flex-1 py-2 px-4 bg-white/5 text-white rounded font-semibold border border-white/10" onClick={() => setShowPasswordModal(false)}>Abbrechen</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
