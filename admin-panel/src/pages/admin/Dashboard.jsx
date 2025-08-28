import React from 'react';
import { Users, Tag, UserPlus, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';

const Dashboard = () => {
  const stats = [
    {
      label: 'Total Users',
      value: '2,847',
      change: '+12%',
      changeType: 'increase',
      icon: Users,
    },
    {
      label: 'Categories',
      value: '34',
      change: '+3',
      changeType: 'increase',
      icon: Tag,
    },
    {
      label: 'Fake Users',
      value: '156',
      change: '+8%',
      changeType: 'increase',
      icon: UserPlus,
    },
    {
      label: 'Growth Rate',
      value: '18.2%',
      change: '+2.4%',
      changeType: 'increase',
      icon: TrendingUp,
    },
  ];

  const cityData = [
    { name: 'Barcelona', users: 847, fakeUsers: 156 },
    { name: 'Madrid', users: 623, fakeUsers: 89 },
    { name: 'Paris', users: 445, fakeUsers: 67 },
    { name: 'Rome', users: 334, fakeUsers: 45 },
    { name: 'Berlin', users: 298, fakeUsers: 34 },
  ];

  const loginTypeData = [
    { name: 'Social Login', value: 1847, color: '#3B82F6' },
    { name: 'Normal Login', value: 1000, color: '#10B981' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span
                  className={`text-sm font-medium ${
                    stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-2">from last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Distribution by City */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">User Distribution by City</h3>
            <BarChart3 className="w-5 h-5 text-gray-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="users" fill="#3B82F6" name="Real Users" />
              <Bar dataKey="fakeUsers" fill="#10B981" name="Fake Users" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Login Type Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Login Type Distribution</h3>
            <PieChart className="w-5 h-5 text-gray-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={loginTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {loginTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { action: 'New category "Outdoor Sports" created', time: '2 minutes ago', type: 'category' },
              { action: 'Fake user batch generated for Barcelona', time: '15 minutes ago', type: 'user' },
              { action: 'Social login filter applied', time: '1 hour ago', type: 'filter' },
              { action: 'New user registered from Madrid', time: '2 hours ago', type: 'user' },
            ].map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'category'
                      ? 'bg-blue-500'
                      : activity.type === 'user'
                      ? 'bg-green-500'
                      : 'bg-yellow-500'
                  }`}
                />
                <div>
                  <p className="text-sm text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 text-left bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <Tag className="w-5 h-5 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">Create Category</h4>
              <p className="text-sm text-gray-600">Add new category with auto tags</p>
            </button>
            <button className="p-4 text-left bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <UserPlus className="w-5 h-5 text-green-600 mb-2" />
              <h4 className="font-medium text-gray-900">Generate Fake Users</h4>
              <p className="text-sm text-gray-600">Create test users for cities</p>
            </button>
            <button className="p-4 text-left bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <Users className="w-5 h-5 text-purple-600 mb-2" />
              <h4 className="font-medium text-gray-900">Manage Users</h4>
              <p className="text-sm text-gray-600">Filter and view user data</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
