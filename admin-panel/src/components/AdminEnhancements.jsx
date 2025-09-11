import React, { useEffect, useState } from "react";
import axios from "../utils/api";

const AdminEnhancements = () => {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    axios.get("/admin/settings").then((res) => {
      setSettings(res.data.data.settings);
    });
  }, []);

  const handleSave = async () => {
    await axios.post("/admin/settings", settings);
    alert("Settings updated!");
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Admin Settings</h2>
      <div>
        <label className="block mb-2">Provider Share</label>
        <input
          type="number"
          value={settings.revenue_split.provider}
          onChange={(e) =>
            setSettings({
              ...settings,
              revenue_split: {
                ...settings.revenue_split,
                provider: Number(e.target.value),
              },
            })
          }
          className="w-full p-2 border rounded-md dark:bg-gray-700"
        />
      </div>
      <div className="mt-4">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default AdminEnhancements;
