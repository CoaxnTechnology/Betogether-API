// src/components/QuickActions.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const QuickActions = () => {
  const nav = useNavigate();
  const actions = [
    {
      title: "Create Category",
      desc: "Add new category with auto tags",
      color: "bg-blue-50",
      icon: "🏷️",
      to: "/categories",
    },
    {
      title: "Generate Fake Users",
      desc: "Create test users for cities",
      color: "bg-green-50",
      icon: "👥",
      to: "/fake-users",
    },
    {
      title: "Manage Users",
      desc: "Filter and view user data",
      color: "bg-purple-50",
      icon: "🧑‍💼",
      to: "/users",
    },
   
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <div className="grid md:grid-cols-4 gap-4">
        {actions.map((a) => (
          <button
            key={a.title}
            onClick={() => nav(a.to)}
            className={`flex items-start gap-4 p-4 rounded-lg border ${a.color} hover:shadow`}
          >
            <div className="text-2xl">{a.icon}</div>
            <div className="text-left">
              <div className="font-medium">{a.title}</div>
              <div className="text-sm text-gray-500">{a.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
