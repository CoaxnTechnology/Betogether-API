import React, { useState } from "react";
import { Plus, Upload, Tag, Save, X, Download, Image } from "lucide-react";
import Papa from "papaparse";

const Categories = () => {
  const [categories, setCategories] = useState([
    {
      id: "1",
      name: "Outdoor Sports",
      image:
        "https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg?auto=compress&cs=tinysrgb&w=400",
      tags: ["athletics", "fitness", "outdoor", "team sports", "adventure"],
      createdAt: "2025-01-10T10:30:00Z",
    },
    {
      id: "2",
      name: "Cultural Events",
      image:
        "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400",
      tags: ["culture", "arts", "events", "community", "social"],
      createdAt: "2025-01-09T15:45:00Z",
    },
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", image: "" });
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const downloadCSV = () => {
    const csvData = categories.map((category) => ({
      ID: category.id,
      Name: category.name,
      "Image URL": category.image,
      Tags: category.tags.join(", "),
      "Created At": new Date(category.createdAt).toLocaleDateString(),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `categories_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleImageUpload = (file) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        setFormData((prev) => ({ ...prev, image: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  const generateTags = async (categoryName) => {
    setIsGeneratingTags(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const tagMappings = {
      sports: ["athletics", "fitness", "team sports", "competition", "training"],
      food: ["cuisine", "dining", "restaurants", "cooking", "nutrition"],
      music: ["concerts", "festivals", "performance", "entertainment", "live music"],
      art: ["galleries", "exhibitions", "creativity", "visual arts", "culture"],
      travel: ["exploration", "tourism", "adventure", "destinations", "experiences"],
      tech: ["innovation", "digital", "startups", "networking", "technology"],
    };

    const lowerName = categoryName.toLowerCase();
    let tags = [];

    for (const [key, values] of Object.entries(tagMappings)) {
      if (lowerName.includes(key)) {
        tags = values;
        break;
      }
    }

    if (tags.length === 0) {
      tags = ["community", "social", "events", "networking", "local"];
    }

    setIsGeneratingTags(false);
    return tags;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const tags = await generateTags(formData.name);

    const newCategory = {
      id: Date.now().toString(),
      name: formData.name,
      image:
        formData.image ||
        "https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=400",
      tags,
      createdAt: new Date().toISOString(),
    };

    setCategories((prev) => [newCategory, ...prev]);
    setFormData({ name: "", image: "" });
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
          <p className="text-gray-600">
            Manage categories with automatic tag generation
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Category</span>
          </button>
          <button
            onClick={downloadCSV}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Create New Category
            </h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Outdoor Sports"
                  required
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Image
                </label>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {formData.image ? (
                    <div className="space-y-2">
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded-lg mx-auto"
                      />
                      <p className="text-sm text-gray-600">
                        Image uploaded successfully
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, image: "" }))
                        }
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove image
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Image className="w-8 h-8 text-gray-400 mx-auto" />
                      <p className="text-sm text-gray-600">
                        Drag and drop an image here, or click to select
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileInput}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="inline-flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Choose file</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* URL input alternative */}
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Or enter image URL
                  </label>
                  <input
                    type="url"
                    value={
                      typeof formData.image === "string" &&
                      formData.image.startsWith("http")
                        ? formData.image
                        : ""
                    }
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, image: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Tag className="w-4 h-4" />
                <span>
                  Tags will be automatically generated using HrFlow.ai API
                </span>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingTags || !formData.name.trim()}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingTags ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Generating Tags...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Create Category</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <img
              src={category.image}
              alt={category.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {category.name}
              </h3>
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-2">Generated Tags:</p>
                <div className="flex flex-wrap gap-1">
                  {category.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Created {new Date(category.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Categories;
