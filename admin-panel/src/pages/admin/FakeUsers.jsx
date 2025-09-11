// src/pages/admin/FakeUsers.jsx
import React, { useEffect, useState } from "react";
import axios from "../../utils/api";
import { useNavigate } from "react-router-dom";

/* ----------------------- Config / constants ----------------------- */
const CITY_OPTIONS = [
  { value: "Barcelona", label: "Barcelona (Launch City)" },
  { value: "Madrid", label: "Madrid" },
  { value: "Paris", label: "Paris" },
  { value: "Rome", label: "Rome" },
  { value: "Berlin", label: "Berlin" },
];

const AUDIENCES = ["tourists", "students", "professionals", "families", "other"];
const MAX_EXPORT_ROWS = 10000;

/* ----------------------- Helpers ----------------------- */
const audienceLabelFromString = (s) => {
  if (!s) return "Other";
  const v = s.toString().toLowerCase();
  if (v.includes("tour")) return "Tourists";
  if (v.includes("student")) return "Students";
  if (v.includes("prof")) return "Professionals";
  if (v.includes("family")) return "Families";
  return v.charAt(0).toUpperCase() + v.slice(1);
};

const cityLabel = (key) => {
  if (!key) return "Unknown";
  const s = key.toString().toLowerCase();
  if (s.includes("barc")) return "Barcelona, Spain";
  if (s.includes("madrid")) return "Madrid, Spain";
  if (s.includes("paris")) return "Paris, France";
  if (s.includes("rome")) return "Rome, Italy";
  if (s.includes("berlin")) return "Berlin, Germany";
  return key;
};

const formatDate = (raw) => {
  if (!raw) return "-";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  } catch {
    return raw;
  }
};

/* ----------------------- Component ----------------------- */
const FakeUsers = () => {
  const [usersByCity, setUsersByCity] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [city, setCity] = useState(CITY_OPTIONS[0].value);
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [count, setCount] = useState(5);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);

  const navigate = useNavigate();

  const normalizeUsersArray = (maybe) => {
    if (!maybe) return [];
    if (Array.isArray(maybe)) return maybe;
    if (typeof maybe === "object") return Object.values(maybe);
    return [];
  };

  const loadFakeUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/admin/fake-users");
      const payload = res?.data ?? res ?? {};
      const dataArray =
        payload?.data?.fake_users ??
        payload?.fake_users ??
        payload?.data ??
        payload;
      const items = normalizeUsersArray(dataArray);

      const grouped = items.reduce((acc, u) => {
        const cityKey = (u.city ?? u.city_name ?? u.location ?? "unknown")
          .toString()
          .toLowerCase();

        const statusRaw =
          (u.status && String(u.status).toLowerCase()) ??
          (typeof u.active === "boolean"
            ? u.active
              ? "active"
              : "blocked"
            : undefined) ??
          "active";

        // attempt numeric server id if available (not required for email flow)
        const possibleServerId = u.id ?? u._id ?? null;
        let numericServerId = null;
        if (possibleServerId !== null && possibleServerId !== undefined) {
          const n = Number(possibleServerId);
          if (Number.isInteger(n)) numericServerId = n;
        }

        acc[cityKey] = acc[cityKey] || [];
        acc[cityKey].push({
          id: u.id ?? u._id ?? u.email ?? Math.random().toString(36).slice(2),
          serverId: numericServerId,
          name: u.name ?? u.full_name ?? u.displayName ?? "Unnamed",
          email: u.email ?? u.email_address ?? "",
          target_audience: u.target_audience ?? u.audience ?? "other",
          status: statusRaw,
          created_at:
            u.created_at ??
            u.createdAt ??
            u.created ??
            u.registered_at ??
            "",
          raw: u,
        });
        return acc;
      }, {});
      setUsersByCity(grouped);
    } catch (err) {
      console.error("Failed to load fake users", err);
      setUsersByCity({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFakeUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------------- Actions ----------------------- */

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const body = new URLSearchParams();
      body.append("city", city);
      body.append("target_audience", audience);
      body.append("number", Number(count || 1));

      await axios.post("/admin/fake-users/generate", body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      await loadFakeUsers();
    } catch (err) {
      console.error("Failed to generate fake users", err);
    } finally {
      setGenerating(false);
    }
  };

  // Inline Import
  const handleImport = async () => {
    setImportResult(null);
    setImportError(null);

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImporting(true);
      setImportProgress(0);
      try {
        const form = new FormData();
        form.append("file", file);

        const res = await axios.post("/admin/fake-users/import", form, {
          headers: {},
          onUploadProgress: (event) => {
            if (event.total)
              setImportProgress(
                Math.round((event.loaded * 100) / event.total)
              );
          },
        });

        const data = res?.data ?? {};
        const msg = data?.message ?? data?.detail ?? "Import complete";
        const createdCount = data?.data?.created?.length ?? 0;
        setImportResult(
          `${msg}${createdCount ? ` — ${createdCount} rows created` : ""}`
        );

        setTimeout(() => loadFakeUsers(), 600);
      } catch (err) {
        console.error("Import failed:", err);
        const resp = err?.response?.data;
        let message = err?.message || "Import failed";

        if (resp) {
          if (typeof resp === "string") {
            message = resp;
          } else if (Array.isArray(resp)) {
            try {
              message = JSON.stringify(resp, null, 2);
            } catch {
              message = String(resp);
            }
          } else if (resp.detail && typeof resp.detail === "string") {
            message = resp.detail;
          } else if (resp.message && typeof resp.message === "string") {
            message = resp.message;
          } else {
            try {
              message = JSON.stringify(resp, null, 2);
            } catch {
              message = String(resp);
            }
          }
        } else if (err.message) {
          message = err.message;
        }

        setImportError(message);
      } finally {
        setImporting(false);
        setTimeout(() => setImportProgress(0), 600);
      }
    };
    input.click();
  };

  const exportCSV = () => {
    const rows = [["Name", "Email", "City", "Target Audience", "Status", "Created"]];
    Object.entries(usersByCity).forEach(([cityKey, arr]) => {
      arr.forEach((u) => {
        rows.push([
          (u.name ?? "").replace(/"/g, '""'),
          (u.email ?? "").replace(/"/g, '""'),
          cityKey,
          (u.target_audience ?? "").replace(/"/g, '""'),
          (u.status ?? "").replace(/"/g, '""'),
          (u.created_at ?? "").replace(/"/g, '""'),
        ]);
      });
    });

    if (rows.length > MAX_EXPORT_ROWS) {
      alert("Too many rows to export. Please narrow down the selection.");
      return;
    }

    const csv = rows.map((r) => `"${r.join('","')}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fake_users.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // --- Status toggle (email-based, no numeric id required) ---
  const updateStatusOnServer = async (email, nextStatus) => {
    if (!email) throw new Error("Missing email for status update");
    const body = new URLSearchParams();
    body.append("email", email);
    body.append("status", nextStatus);

    // endpoint: PUT /admin/fake-users/status (expects form fields 'email' and 'status')
    // If your axios baseURL includes "/api", keep the path as "/admin/fake-users/status".
    const path = "/admin/fake-users/status";

    return axios.put(path, body.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    });
  };

  const handleToggleStatus = async (u) => {
    const current = String(u.status || "").toLowerCase();
    const next = current === "active" ? "blocked" : "active";

    const email = (u.email || "").trim();
    if (!email) {
      alert("Cannot update this user: missing email.");
      return;
    }

    if (!confirm(`Set ${u.name} (${email}) to ${next}?`)) return;

    try {
      await updateStatusOnServer(email, next);
      await loadFakeUsers();
    } catch (err) {
      console.error("Failed to update status", err);
      if (err?.response?.data) console.error("server response:", err.response.data);
      alert("Failed to update status. See console/network for server response (422/400 details).");
    }
  };

  /* ----------------------- Render ----------------------- */
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Fake User Creation</h2>
          <p className="text-gray-500 text-sm">
            Generate realistic test users for different cities and audiences
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 mr-2">
            {Object.values(usersByCity).flat().length} fake users created
          </div>

          <button
            onClick={() => {
              setCity(CITY_OPTIONS[0].value);
              handleGenerate();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow"
            disabled={generating}
          >
            ⤴ Generate Users
          </button>

          <button
            onClick={handleImport}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md shadow"
            disabled={importing}
          >
            ⤴ Import CSV
          </button>

          <button
            onClick={exportCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow"
          >
            ⬇ Download CSV
          </button>
        </div>
      </div>

      {/* Import status */}
      {importing && (
        <div className="bg-white p-3 rounded mb-4">
          <div className="text-sm text-gray-700">
            Uploading CSV... {importProgress}%
          </div>
          <div className="w-full bg-gray-100 h-2 rounded mt-2">
            <div
              style={{ width: `${importProgress}%` }}
              className="h-2 rounded bg-blue-500"
            />
          </div>
        </div>
      )}
      {importResult && (
        <div className="bg-green-50 text-green-800 p-3 rounded mb-4">
          {importResult}
        </div>
      )}
      {importError && (
        <div className="bg-red-50 text-red-800 p-3 rounded mb-4">
          <div className="font-medium">Import error:</div>
          <pre className="whitespace-pre-wrap text-sm mt-1">{importError}</pre>
        </div>
      )}

      {/* generate form */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Generate Fake Users</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div>
            <label className="text-sm text-gray-600">City *</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              {CITY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">Target Audience *</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">Number of Users</label>
            <input
              value={count}
              onChange={(e) => setCount(e.target.value)}
              type="number"
              min="1"
              className="w-full border rounded-md px-3 py-2"
            />
          </div>

          <div className="flex items-end justify-end">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow disabled:opacity-50"
            >
              {generating ? "Generating…" : "↻ Generate"}
            </button>
          </div>
        </div>

        <div className="mt-4 border rounded-md p-4 bg-blue-50 text-sm text-blue-800">
          <div className="font-medium mb-1">Initial Launch Configuration</div>
          <div className="text-sm text-blue-700">
            The platform is initially launching in Barcelona to gather user
            feedback. Additional cities will be enabled in future phases based
            on user engagement and feedback.
          </div>
        </div>
      </div>

      {/* per-city cards */}
      {loading ? (
        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
          Loading...
        </div>
      ) : Object.keys(usersByCity).length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
          No fake users created
        </div>
      ) : (
        Object.entries(usersByCity).map(([cityKey, arr]) => (
          <div key={cityKey} className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-xl">📍</div>
                <div>
                  <div className="text-lg font-semibold">{cityLabel(cityKey)}</div>
                  <div className="text-xs text-gray-500">{arr.length} users</div>
                </div>
              </div>

              <div>
                <button className="text-sm bg-blue-50 px-3 py-1 rounded-full text-blue-700 border border-blue-100">
                  Launch City
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-600 text-sm">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Target Audience</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="text-sm">
                  {arr.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="p-3 flex items-center gap-3">
                        <span className="text-gray-400">👤</span>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-gray-500 text-xs">{u.email}</div>
                        </div>
                      </td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">
                        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs">
                          {audienceLabelFromString(u.target_audience)}
                        </span>
                      </td>
                      <td className="p-3">
                        {String(u.status).toLowerCase() === "active" ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                            active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                            {u.status ?? "blocked"}
                          </span>
                        )}
                      </td>
                      <td className="p-3">{formatDate(u.created_at)}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2 py-1 rounded-md text-sm ${
                            String(u.status).toLowerCase() === "active"
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-green-50 text-green-700 hover:bg-green-100"
                          }`}
                          title={String(u.status).toLowerCase() === "active" ? "Block user" : "Activate user"}
                        >
                          {String(u.status).toLowerCase() === "active" ? "⛔ Block" : "✔ Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default FakeUsers;
