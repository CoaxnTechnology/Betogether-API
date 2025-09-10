// src/pages/admin/AdminSettings.jsx
import React, { useEffect, useState } from "react";
import axios from "../../utils/api";

const clamp = (v, min = 0, max = 100) => {
  const n = Number(v);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
};

const ProgressBar = ({ provider, seeker, platform }) => {
  const total = provider + seeker + platform || 100;
  // normalize to 100 if sum is 0
  const p = Math.round((provider / total) * 100);
  const s = Math.round((seeker / total) * 100);
  const pf = 100 - p - s; // ensure exact 100
  return (
    <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden relative">
      <div
        style={{ width: `${p}%` }}
        className="absolute left-0 top-0 bottom-0 bg-blue-500"
        title={`Provider ${provider}%`}
      />
      <div
        style={{ width: `${s}%`, left: `${p}%` }}
        className="absolute top-0 bottom-0 bg-purple-500"
        title={`Seeker ${seeker}%`}
      />
      <div
        style={{ width: `${pf}%`, left: `${p + s}%` }}
        className="absolute top-0 bottom-0 bg-gray-500"
        title={`Platform ${platform}%`}
      />
      <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium pointer-events-none">
        <span style={{ textShadow: "0 1px 0 rgba(0,0,0,0.25)" }}>
          {provider}% / {seeker}% / {platform}%
        </span>
      </div>
    </div>
  );
};

const AdminSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get("/admin/settings");
        const s = res?.data?.data?.settings ?? {
          discounts: { global_discount: 0, category_wise: false, seasonal: false },
          revenue_split: { provider: 80, seeker: 20, platform: 0 },
        };
        if (!mounted) return;
        setSettings(s);
      } catch (err) {
        console.error("Failed to load settings", err);
        setError("Failed to load settings");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!validationError) return;
    const t = setTimeout(() => setValidationError(null), 3500);
    return () => clearTimeout(t);
  }, [validationError]);

  if (loading) return <div className="p-6">Loading settings…</div>;
  if (!settings) return <div className="p-6 text-red-600">No settings loaded</div>;

  const onChangeDiscount = (key, value) => {
    setSettings((s) => ({ ...s, discounts: { ...s.discounts, [key]: value } }));
  };

  const onChangeRevenue = (key, value) => {
    const v = clamp(value, 0, 100);
    setSettings((s) => ({ ...s, revenue_split: { ...s.revenue_split, [key]: v } }));
  };

  const validateAndSave = async () => {
    setValidationError(null);
    setSuccessMsg(null);

    const prov = Number(settings.revenue_split.provider || 0);
    const seek = Number(settings.revenue_split.seeker || 0);
    const plat = Number(settings.revenue_split.platform || 0);

    if (prov < 0 || seek < 0 || plat < 0) {
      setValidationError("Percent values must be non-negative");
      return;
    }
    if (prov + seek + plat > 100) {
      setValidationError("Sum of Provider + Seeker + Platform must not exceed 100%");
      return;
    }

    setSaving(true);
    try {
      // backend expects a JSON body: new_settings
      await axios.post("/admin/settings", {
        revenue_split: {
          provider: prov,
          seeker: seek,
          platform: plat,
        },
        discounts: {
          global_discount: Number(settings.discounts.global_discount || 0),
          category_wise: !!settings.discounts.category_wise,
          seasonal: !!settings.discounts.seasonal,
        },
      });
      setSuccessMsg("Settings updated");
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      console.error("Failed to save settings", err);
      const resp = err?.response?.data;
      let msg = "Save failed";
      if (resp?.detail) msg = typeof resp.detail === "string" ? resp.detail : JSON.stringify(resp.detail);
      else if (resp?.message) msg = resp.message;
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const { discounts, revenue_split } = settings;
  const provider = Number(revenue_split.provider ?? 0);
  const seeker = Number(revenue_split.seeker ?? 0);
  const platform = Number(revenue_split.platform ?? 0);

  return (
    <div className="space-y-6 p-6">
      {error && (
        <div className="bg-red-50 text-red-800 p-3 rounded">
          <strong>Error:</strong> {String(error)}
        </div>
      )}

      {validationError && (
        <div className="bg-yellow-50 text-yellow-800 p-3 rounded">
          <strong>Validation:</strong> {validationError}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 text-green-800 p-3 rounded">
          {successMsg}
        </div>
      )}

      {/* Discount Configuration Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold mb-4">💲 Discount Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-1">
            <label className="block text-sm text-gray-700 mb-1">Global Discount (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={discounts?.global_discount ?? 0}
              onChange={(e) => onChangeDiscount("global_discount", clamp(e.target.value, 0, 100))}
              className="w-full p-3 border rounded-md"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={!!discounts?.category_wise}
                onChange={(e) => onChangeDiscount("category_wise", e.target.checked)}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">Category-wise discounts</span>
            </label>

            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={!!discounts?.seasonal}
                onChange={(e) => onChangeDiscount("seasonal", e.target.checked)}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">Seasonal discounts</span>
            </label>
          </div>
        </div>
      </div>

      {/* Revenue Split Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold mb-4">% Revenue Split Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Service Provider (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={provider}
              onChange={(e) => onChangeRevenue("provider", clamp(e.target.value))}
              className="w-full p-3 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Service Seeker (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={seeker}
              onChange={(e) => onChangeRevenue("seeker", clamp(e.target.value))}
              className="w-full p-3 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Platform Fee (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={platform}
              onChange={(e) => onChangeRevenue("platform", clamp(e.target.value))}
              className="w-full p-3 border rounded-md"
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-2">Revenue Distribution</div>
          <ProgressBar provider={provider} seeker={seeker} platform={platform} />
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <div>Provider</div>
            <div>Seeker</div>
            <div>Platform</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={validateAndSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>

          <button
            onClick={() => {
              // reset to loaded settings
              setSettings((s) => ({ ...s }));
              setSuccessMsg(null);
              setError(null);
            }}
            className="px-4 py-2 border rounded-md"
          >
            Reset
          </button>

          <div className="text-sm text-gray-500 ml-auto">
            Sum: {provider + seeker + platform}% {provider + seeker + platform > 100 && <span className="text-red-600"> (exceeds 100%)</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
