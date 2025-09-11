// src/pages/admin/Users.jsx
import React, { useEffect, useState } from "react";
import axios from "../../utils/api";

/**
 * Users page:
 * - robust parsing of backend
 * - maps social -> "Google Auth" label and manual/local -> "Manual Login"
 */
const Users = () => {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("All Login Types");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const normalizeUser = (u) => ({
    id: u.id ?? u._id ?? `${u.email ?? ""}-${Math.random()}`,
    name: u.name ?? u.full_name ?? u.username ?? u.displayName ?? "",
    email: u.email ?? u.email_address ?? "",
    city: u.city ?? u.location ?? u.city_name ?? "",
    login_type: (u.login_type ?? u.type ?? u.auth_provider ?? "").toString().toLowerCase(),
    status: u.status ?? (u.active ? "active" : undefined) ?? (u.is_active ? "active" : undefined),
    registered_at: u.registered_at ?? u.created_at ?? u.createdAt ?? u.created ?? "",
    raw: u,
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
    axios.get("/admin/users")
      .then((res) => {
        console.log("users raw response:", res);
        const payload = res?.data ?? res ?? {};
        const candidates = [payload?.data?.users, payload?.users, payload?.data, payload];
        let found = null;
        for (const c of candidates) {
          if (Array.isArray(c)) { found = c; break; }
          if (c && typeof c === "object" && Array.isArray(c.users)) { found = c.users; break; }
        }
        if (!found && payload && typeof payload === "object") {
          const maybe = Object.values(payload).filter((v) => v && (v.email || v.name));
          if (maybe.length) found = maybe;
        }
        if (!found) {
          console.warn("Could not find users array in response; payload:", payload);
          setUsers([]);
        } else {
          setUsers(found.map(normalizeUser));
        }
      })
      .catch((err) => {
        console.error("Failed to load users:", err);
        setError(err?.response?.data ?? err.message ?? "Failed to load");
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const isSocial = (loginType) => {
    if (!loginType) return false;
    const s = loginType.toString().toLowerCase();
    return s.includes("social") || s.includes("google") || s.includes("oauth") || s.includes("facebook") || s.includes("apple");
  };
  const isManual = (loginType) => {
    if (!loginType) return false;
    const s = loginType.toString().toLowerCase();
    return s.includes("manual") || s.includes("normal") || s.includes("local") || s.includes("email");
  };

  const filteredUsers = users.filter((u) => {
    const typeMatches =
      filter === "All Login Types" ||
      (filter === "Google Auth" && isSocial(u.login_type)) ||
      (filter === "Manual Login" && isManual(u.login_type));
    const q = search.trim().toLowerCase();
    const searchMatches = !q || (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q)) || (u.city && u.city.toLowerCase().includes(q));
    return typeMatches && searchMatches;
  });

  const exportCSV = () => {
    const rows = [
      ["Name", "Email", "City", "Login Type", "Status", "Registered"],
      ...filteredUsers.map((u) => [
        (u.name ?? "").replace(/"/g, '""'),
        (u.email ?? "").replace(/"/g, '""'),
        (u.city ?? "").replace(/"/g, '""'),
        isSocial(u.login_type) ? "Google Auth" : isManual(u.login_type) ? "Manual Login" : (u.login_type ?? ""),
        u.status ?? "",
        u.registered_at ?? "",
      ]),
    ];
    const csv = rows.map((r) => `"${r.join('","')}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-gray-500 text-sm">View and filter registered users by login type</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={exportCSV} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow">⬇ Download CSV</button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Search users by name or email..." />
        </div>

        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded-md px-3 py-2">
          <option>All Login Types</option>
          <option>Google Auth</option>
          <option>Manual Login</option>
        </select>
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-700 text-sm">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Login Type</th>
              <th className="p-3">City</th>
              <th className="p-3">Status</th>
              <th className="p-3">Registered</th>
            </tr>
          </thead>

          <tbody className="text-sm">
            {loading && (<tr><td colSpan="5" className="p-6 text-center text-gray-500">Loading users...</td></tr>)}
            {!loading && error && (<tr><td colSpan="5" className="p-6 text-center text-red-600">Error loading users: {String(error)}</td></tr>)}
            {!loading && !error && filteredUsers.length === 0 && (<tr><td colSpan="5" className="p-6 text-center text-gray-500">No users found</td></tr>)}

            {!loading && !error && filteredUsers.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">
                  <div><div className="font-medium">{u.name}</div><div className="text-gray-500">{u.email}</div></div>
                </td>

                <td className="p-3">
                  {isSocial(u.login_type) ? (
                    <span className="inline-flex items-center gap-2 text-blue-600">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="1.2"/></svg>
                      Google Auth
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-gray-700">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 20v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" strokeWidth="1.2"/><circle cx="12" cy="8" r="3" strokeWidth="1.2"/></svg>
                      Manual Login
                    </span>
                  )}
                </td>

                <td className="p-3">{u.city ?? "-"}</td>

                <td className="p-3">
                  {u.status === "active" ? <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">active</span> : <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">{u.status ?? "unknown"}</span>}
                </td>

                <td className="p-3">{u.registered_at ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      
    </div>
  );
};

export default Users;
