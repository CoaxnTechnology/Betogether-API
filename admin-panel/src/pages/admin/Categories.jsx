// src/pages/admin/Categories.jsx
import React, { useEffect, useState } from "react";
import axios from "../../utils/api";

const PREVIEW_TAG_COUNT = 6; // how many tags to show on the card preview
const MAX_TAGS = 50; // UI knows backend caps tags at 50 (for display/validation)

const EyeIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z"/>
    <circle cx="12" cy="12" r="3" strokeWidth="1.5"/>
  </svg>
);

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    discount_percentage: 0,
    provider_share: 80,
    seeker_share: 20,
    image: null,
    image_url: "",
  });
  const [saving, setSaving] = useState(false);

  // modal to view all tags
  const [tagModal, setTagModal] = useState({ open: false, tags: [], title: "" });

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/admin/categories");
      const cats = res?.data?.data?.categories ?? res?.data?.categories ?? [];
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err) {
      console.error("Failed to load categories", err);
      alert("❌ Failed to load categories");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const downloadCSV = () => {
    if (!categories || categories.length === 0) {
      alert("⚠ No categories to export");
      return;
    }
    setDownloadLoading(true);
    try {
      const rows = [["id", "name", "tags", "provider_share", "seeker_share", "discount_percentage", "image", "created_at"]];
      categories.forEach((c) => {
        rows.push([
          c.id ?? "",
          (c.name ?? "").replace(/"/g, '""'),
          (Array.isArray(c.tags) ? c.tags.join("|") : (c.tags ?? "")).replace(/"/g, '""'),
          c.provider_share ?? "",
          c.seeker_share ?? "",
          c.discount_percentage ?? "",
          c.image ?? "",
          c.created_at ?? "",
        ]);
      });
      const csv = rows.map((r) => `"${r.join('","')}"`).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "categories.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.name.trim()) {
      alert("⚠ Category name is required");
      return;
    }
    // backend in your code required provider+seeker <= 100. Frontend here requires sum === 100; change if desired
    if (Number(form.provider_share) + Number(form.seeker_share) !== 100) {
      alert("⚠ Provider + Seeker share must equal 100%");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("discount_percentage", form.discount_percentage);
      fd.append("provider_share", form.provider_share);
      fd.append("seeker_share", form.seeker_share);
      if (form.image) fd.append("image_file", form.image); // backend reads image_file
      if (form.image_url) fd.append("image_url", form.image_url);

      await axios.post("/admin/categories", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // After creation, reload categories
      setShowForm(false);
      setForm({
        name: "",
        discount_percentage: 0,
        provider_share: 80,
        seeker_share: 20,
        image: null,
        image_url: "",
      });
      loadCategories();
    } catch (err) {
      console.error("Failed to create category", err);
      alert("❌ Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  const openTagModal = (title, tags) => {
    setTagModal({ open: true, tags: tags || [], title });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Categories</h2>
          <p className="text-gray-500">Manage categories with automatic tag generation</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700"
          >
            + Create Category
          </button>
          <button
            onClick={downloadCSV}
            disabled={downloadLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 disabled:opacity-60"
          >
            {downloadLoading ? "Preparing…" : "⬇ Download CSV"}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow relative">
          <button
            onClick={() => setShowForm(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
          <h3 className="text-lg font-semibold mb-4">Create New Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Category Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-md p-2"
                placeholder="e.g., Outdoor Sports"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Discount (%)</label>
              <input
                type="number"
                value={form.discount_percentage}
                onChange={(e) => setForm({ ...form, discount_percentage: Number(e.target.value) })}
                className="w-full border rounded-md p-2"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Service Provider (%)</label>
              <input
                type="number"
                value={form.provider_share}
                onChange={(e) => setForm({ ...form, provider_share: Number(e.target.value) })}
                className="w-full border rounded-md p-2"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Service Seeker (%)</label>
              <input
                type="number"
                value={form.seeker_share}
                onChange={(e) => setForm({ ...form, seeker_share: Number(e.target.value) })}
                className="w-full border rounded-md p-2"
                min="0"
                max="100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Category Image</label>
              <div className="border-dashed border-2 rounded-md p-6 text-center text-gray-500">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setForm({ ...form, image: e.target.files?.[0] })}
                />
                <p className="text-sm mt-2">Drag and drop an image here, or click to select</p>
              </div>
              <div className="mt-3">
                <label className="block text-sm text-gray-700 mb-1">Or enter image URL</label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className="w-full border rounded-md p-2"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md shadow disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create Category"}
            </button>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            🛈 Tags are auto-generated from TagInfo/OSM values. Backend caps tags at {MAX_TAGS}.
          </div>
        </div>
      )}

      {/* Loader */}
      {loading && (
        <div className="text-center py-10 text-gray-500">⏳ Loading categories…</div>
      )}

      {/* Empty state */}
      {!loading && categories.length === 0 && (
        <div className="text-center py-10 text-gray-500">📭 No categories yet. Create one to get started.</div>
      )}

      {/* Category cards */}
      {!loading && categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((c) => {
            // ensure we only show up to MAX_TAGS (backend cap)
            const tags = Array.isArray(c.tags) ? c.tags.slice(0, MAX_TAGS) : [];
            const preview = tags.slice(0, PREVIEW_TAG_COUNT);
            const createdAt = c.created_at ? new Date(c.created_at) : null;
            const discount = Number(c.discount_percentage || 0);
            return (
              <div key={c.id} className="bg-white rounded-lg shadow overflow-hidden relative">
                {/* Image area */}
                <div className="h-44 bg-gray-100 relative">
                  {c.image ? (
                    <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                  )}

                  {/* Discount badge - positioned inside the image top-right */}
                  {discount > 0 && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-block bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium shadow">
                        {discount}% OFF
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-semibold">{c.name}</h3>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-sm rounded">Provider: {c.provider_share}%</span>
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 text-sm rounded">Seeker: {c.seeker_share}%</span>
                  </div>

                  <div className="mt-3 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Generated Tags:</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">{tags.length} tags</div>

                        {/* eye icon clickable to open modal */}
                        <button
                          onClick={() => openTagModal(c.name, tags)}
                          title="View all tags"
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <EyeIcon className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* horizontal preview row with scrollbar if overflow */}
                    <div className="mt-2">
                      {preview.length === 0 ? (
                        <div className="text-xs text-gray-400">No tags</div>
                      ) : (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {preview.map((t) => (
                            <div key={t} className="px-2 py-1 bg-indigo-50 text-indigo-800 text-xs rounded-full whitespace-nowrap">
                              {t}
                            </div>
                          ))}
                          <div style={{ minWidth: 8 }} />
                        </div>
                      )}
                    </div>

                    {tags.length > preview.length && (
                      <div className="mt-2">
                        <button
                          onClick={() => openTagModal(c.name, tags)}
                          className="text-sm text-blue-600 underline"
                        >
                          View all {tags.length} tags
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 text-xs text-gray-500">
                    Created: {createdAt ? createdAt.toLocaleDateString() : "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tag modal */}
      {tagModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-lg w-11/12 max-w-2xl shadow-lg">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold">Tags for: {tagModal.title}</h3>
              <button
                onClick={() => setTagModal({ open: false, tags: [], title: "" })}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {tagModal.tags.map((t) => (
                <div key={t} className="px-3 py-1 bg-gray-100 rounded-full text-sm">{t}</div>
              ))}
            </div>

            <div className="mt-4 text-right">
              <button
                onClick={() => setTagModal({ open: false, tags: [], title: "" })}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
