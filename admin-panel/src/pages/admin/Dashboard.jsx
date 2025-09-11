// src/pages/admin/Dashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "../../utils/api";
import QuickActions from "../../components/QuickActions";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

/* ---------- helpers ---------- */
function computeGrowth(current, previous, decimals = 1) {
  if (current == null || previous == null) return { text: "-", value: null, sign: "none" };
  const cur = Number(current);
  const prev = Number(previous);
  if (isNaN(cur) || isNaN(prev)) return { text: "-", value: null, sign: "none" };
  if (prev === 0) {
    if (cur === 0) return { text: "-", value: 0, sign: "none" };
    return { text: "New", value: null, sign: "new" };
  }
  const rate = ((cur - prev) / prev) * 100;
  const fixed = Number(rate.toFixed(decimals));
  return {
    text: `${fixed > 0 ? "+" : ""}${fixed}% from last month`,
    value: fixed,
    sign: fixed > 0 ? "positive" : fixed < 0 ? "negative" : "none",
  };
}

/* ---------- normalizer (keeps many shapes supported) ---------- */
const normalize = (res) => {
  const body = res?.data ?? res ?? {};
  const data = body?.data ?? body;

  const total_users = data.total_users ?? data.counts?.users ?? data.users ?? data.total ?? null;
  const total_categories = data.total_categories ?? data.counts?.categories ?? data.categories ?? null;
  const fake_users = data.fake_users ?? data.counts?.fake_users ?? 0;

  const prev_total_users = data.previous_total_users ?? data.counts?.previous_users ?? data.previous_total ?? null;
  const growth_rate_direct = data.growth_rate ?? data.growth?.rate ?? null;

  const cityKeys = [
    "user_distribution",
    "city_distribution",
    "city_distribution_by_city",
    "users_by_city",
    "user_counts_by_city",
    "counts_by_city",
    "counts.cities",
    "counts.city_breakdown",
  ];

  let user_distribution = null;
  for (const k of cityKeys) {
    if (k.includes(".")) {
      const [a, b] = k.split(".");
      if (data[a] && data[a][b]) {
        user_distribution = data[a][b];
        break;
      }
    } else if (data[k] !== undefined) {
      user_distribution = data[k];
      break;
    }
  }
  if (!user_distribution && data.counts && typeof data.counts === "object" && data.counts.cities) {
    user_distribution = data.counts.cities;
  }

  let barData = [];
  if (!user_distribution) {
    barData = [];
  } else if (Array.isArray(user_distribution)) {
    barData = user_distribution
      .map((it, i) => {
        if (typeof it === "object" && !Array.isArray(it)) {
          const name = it.name ?? it.city ?? it.label ?? it.key ?? `Item ${i + 1}`;
          const provider = it.provider ?? it.provider_count ?? it.providers ?? it.providerCount ?? null;
          const seeker = it.seeker ?? it.seeker_count ?? it.seekers ?? it.seekerCount ?? null;
          const count = it.count ?? it.value ?? it.total ?? it.users ?? null;

          if (provider != null || seeker != null) {
            return { name, provider: Number(provider ?? 0), seeker: Number(seeker ?? 0) };
          }
          if (count != null) {
            return { name, count: Number(count ?? 0) };
          }
          const ownKeys = Object.keys(it).filter(Boolean);
          if (!("name" in it) && !("city" in it) && ownKeys.length === 1) {
            const k = ownKeys[0];
            return { name: k, count: Number(it[k] ?? 0) };
          }
          return { name, count: 0 };
        } else if (Array.isArray(it)) {
          return { name: it[0], count: Number(it[1] ?? 0) };
        } else {
          return { name: `Item ${i + 1}`, count: Number(it ?? 0) };
        }
      })
      .filter(Boolean);
  } else if (typeof user_distribution === "object") {
    const entries = Object.entries(user_distribution);
    barData = entries.map(([k, v]) => {
      if (v && typeof v === "object") {
        const provider = v.provider ?? v.provider_count ?? v.providers ?? 0;
        const seeker = v.seeker ?? v.seeker_count ?? v.seekers ?? 0;
        if (provider != null || seeker != null) {
          return { name: k, provider: Number(provider ?? 0), seeker: Number(seeker ?? 0) };
        }
        const count = v.count ?? v.total ?? null;
        return { name: k, count: Number(count ?? 0) };
      } else {
        return { name: k, count: Number(v ?? 0) };
      }
    });
  } else {
    barData = [];
  }

  const loginKeys = [
    "login_distribution",
    "login_type_distribution",
    "login",
    "auth_providers",
    "providers",
    "login_counts",
    "loginStats",
  ];
  let loginRaw = null;
  for (const k of loginKeys) {
    if (data[k] !== undefined) {
      loginRaw = data[k];
      break;
    }
  }
  let pieData = [];
  if (!loginRaw) {
    pieData = [];
  } else if (Array.isArray(loginRaw)) {
    pieData = loginRaw
      .map((it) => {
        if (typeof it === "object") {
          const rawLabel = String(it.name ?? it.type ?? it.label ?? it.provider ?? "other").toLowerCase();
          let label = "Other";
          if (rawLabel.includes("manual") || rawLabel.includes("normal")) label = "Normal Login";
          else if (rawLabel.includes("google")) label = "Google Login";
          else if (rawLabel.includes("facebook")) label = "Facebook Login";
          else if (rawLabel.includes("apple")) label = "Apple Login";
          else if (rawLabel.includes("social")) label = "Social Login";

          return { name: label, value: Number(it.value ?? it.count ?? it.total ?? 0) };
        }
        return null;
      })
      .filter(Boolean);
  } else if (typeof loginRaw === "object") {
    pieData = Object.entries(loginRaw).map(([k, v]) => {
      const rawLabel = String(k).toLowerCase();
      let label = "Other";
      if (rawLabel.includes("manual") || rawLabel.includes("normal")) label = "Normal Login";
      else if (rawLabel.includes("google")) label = "Google Login";
      else if (rawLabel.includes("facebook")) label = "Facebook Login";
      else if (rawLabel.includes("apple")) label = "Apple Login";
      else if (rawLabel.includes("social")) label = "Social Login";

      return { name: label, value: Number(v ?? 0) };
    });
  }

  let growth = null;
  if (growth_rate_direct != null) {
    const val = Number(growth_rate_direct);
    growth = { text: `${val > 0 ? "+" : ""}${val}% from last month`, value: val, sign: val > 0 ? "positive" : val < 0 ? "negative" : "none" };
  } else if (total_users != null && prev_total_users != null) {
    growth = computeGrowth(total_users, prev_total_users);
  }

  // fallback recent activity sample
  const fallbackRecent = [
    { title: 'New category "Outdoor Sports" created', time: "2 minutes ago" },
    { title: "Fake user batch generated for Barcelona", time: "15 minutes ago" },
    { title: "Social login filter applied", time: "1 hour ago" },
    { title: "New user registered from Madrid", time: "2 hours ago" },
  ];
  const recent_activity = data.recent_activity ?? data.activity ?? data.recent ?? body?.recent_activity ?? fallbackRecent;

  return {
    total_users,
    total_categories,
    fake_users,
    growth,
    barData,
    pieData,
    recent_activity,
    raw: body,
  };
};

/* constants */
const BAR_COLOR = "#3b82f6";
const BAR_COLOR_SEEKER = "#10b981";
const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

/* Dashboard component */
const Dashboard = () => {
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [state, setState] = useState({
    total_users: null,
    total_categories: null,
    fake_users: null,
    growth: null,
    barData: [],
    pieData: [],
    recent_activity: [],
    raw: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    axios
      .get("/admin/dashboard")
      .then((res) => {
        const normalized = normalize(res);
        if (mountedRef.current) {
          setState(normalized);
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setError(err?.response?.data ?? err.message ?? "Failed to load");
        }
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading dashboard...</p>;
  if (error) return <div className="text-red-500">Error: {String(error)}</div>;

  const { total_users, total_categories, fake_users, growth, barData, pieData, recent_activity } = state;
  const hasProviderSeeker = barData && barData.length > 0 && ("provider" in barData[0] || "seeker" in barData[0]);
  const singleSeries = barData && barData.length > 0 && ("count" in barData[0] && !hasProviderSeeker);

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={total_users ?? "-"} small={growth && growth.value != null ? `${growth.value > 0 ? "+" : ""}${growth.value}%` : null} deltaText={growth?.text} />
        <StatCard title="Categories" value={total_categories ?? "-"} />
        <StatCard title="Fake Users" value={fake_users ?? 0} />
        <StatCard title="Growth Rate" value="- "/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Panel title="User Distribution by City">
          {barData && barData.length > 0 ? (
            <div style={{ width: "100%", height: 340 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} angle={0} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  {hasProviderSeeker ? (
                    <>
                      <Bar dataKey="provider" name="Provider" stackId="a" fill={BAR_COLOR} />
                      <Bar dataKey="seeker" name="Seeker" stackId="a" fill={BAR_COLOR_SEEKER} />
                    </>
                  ) : (
                    <Bar dataKey={singleSeries ? "count" : "count"} name="Users" fill={BAR_COLOR} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500">No distribution data</p>
          )}
        </Panel>

        <Panel title="Login Type Distribution">
          {pieData && pieData.length > 0 ? (
            <div style={{ width: "100%", height: 340 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={90}
                    innerRadius={45}
                    label={(entry) => `${entry.name} ${Math.round((entry.value / (pieData.reduce((s, x) => s + x.value, 0) || 1)) * 100)}%`}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={`c-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend layout="horizontal" verticalAlign="bottom" />
                  <Tooltip formatter={(value) => [value, "Users"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500">No login data</p>
          )}
        </Panel>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mt-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        {Array.isArray(recent_activity) && recent_activity.length > 0 ? (
          <ul className="space-y-3">
            {recent_activity.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full bg-blue-500 mt-1" />
                <div>
                  <div className="text-sm">{a.title ?? a.message ?? a ?? ""}</div>
                  <div className="text-xs text-gray-500">{a.time ?? a.when ?? ""}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No recent activity</p>
        )}
      </div>

      <div className="mt-6">
        <QuickActions />
      </div>
    </div>
  );
};

/* small subcomponents */
const StatCard = ({ title, value, small = null, deltaText = null }) => (
  <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
    <div>
      <div className="text-gray-500">{title}</div>
      <div className="text-4xl font-extrabold">{value}</div>
      {deltaText && <div className="text-sm text-green-600 mt-1">{deltaText}</div>}
    </div>

    <div className="w-12 h-12 rounded-md bg-blue-50 flex items-center justify-center">
      {title.toLowerCase().includes("user") ? (
        <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M17 20v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="8" r="3" strokeWidth="1.5" />
        </svg>
      ) : title.toLowerCase().includes("category") ? (
        <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 7v4a1 1 0 001 1h3" />
          <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 7v10a1 1 0 01-1 1h-3" />
        </svg>
      ) : (
        <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
        </svg>
      )}
    </div>
  </div>
);

const Panel = ({ title, children }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="text-sm text-gray-400"> </div>
    </div>
    <div>{children}</div>
  </div>
);

export default Dashboard;
