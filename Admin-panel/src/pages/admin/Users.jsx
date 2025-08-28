import React, { useState } from 'react';
import { Search, Filter, Users as UsersIcon, Shield, User, Download } from 'lucide-react';
import Papa from 'papaparse';

const Users = () => {
  const [users] = useState([
    {
      id: '1',
      name: 'Maria Garcia',
      email: 'maria.garcia@email.com',
      loginType: 'social',
      provider: 'Google',
      registeredAt: '2025-01-08T14:30:00Z',
      city: 'Barcelona',
      status: 'active',
    },
    {
      id: '2',
      name: 'John Smith',
      email: 'john.smith@email.com',
      loginType: 'normal',
      registeredAt: '2025-01-07T09:15:00Z',
      city: 'Madrid',
      status: 'active',
    },
    {
      id: '3',
      name: 'Sophie Dubois',
      email: 'sophie.dubois@email.com',
      loginType: 'social',
      provider: 'Facebook',
      registeredAt: '2025-01-06T16:45:00Z',
      city: 'Paris',
      status: 'active',
    },
    {
      id: '4',
      name: 'Marco Rossi',
      email: 'marco.rossi@email.com',
      loginType: 'normal',
      registeredAt: '2025-01-05T11:20:00Z',
      city: 'Rome',
      status: 'inactive',
    },
    {
      id: '5',
      name: 'Emma Wilson',
      email: 'emma.wilson@email.com',
      loginType: 'social',
      provider: 'Google',
      registeredAt: '2025-01-04T13:10:00Z',
      city: 'London',
      status: 'active',
    },
    {
      id: '6',
      name: 'Carlos Silva',
      email: 'carlos.silva@email.com',
      loginType: 'normal',
      registeredAt: '2025-01-03T08:30:00Z',
      city: 'Lisbon',
      status: 'active',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [loginFilter, setLoginFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = loginFilter === 'all' || user.loginType === loginFilter;

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const downloadCSV = () => {
    const csvData = filteredUsers.map(user => ({
      ID: user.id,
      Name: user.name,
      Email: user.email,
      'Login Type': user.loginType,
      Provider: user.provider || 'N/A',
      City: user.city,
      Status: user.status,
      'Registered At': new Date(user.registeredAt).toLocaleDateString(),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLoginTypeIcon = (loginType, provider) => {
    if (loginType === 'social') {
      return <Shield className="w-4 h-4 text-blue-600" />;
    }
    return <User className="w-4 h-4 text-gray-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">View and filter registered users by login type</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <UsersIcon className="w-4 h-4" />
          <span>{filteredUsers.length} users</span>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Login Type Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={loginFilter}
              onChange={(e) => setLoginFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Login Types</option>
              <option value="social">Social Login</option>
              <option value="normal">Normal Login</option>
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="mt-3 flex flex-wrap gap-2">
          {loginFilter !== 'all' && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center space-x-1">
              <span>Login: {loginFilter}</span>
              <button
                onClick={() => setLoginFilter('all')}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          {searchTerm && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center space-x-1">
              <span>Search: "{searchTerm}"</span>
              <button
                onClick={() => setSearchTerm('')}
                className="text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Login Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  City
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registered
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getLoginTypeIcon(user.loginType, user.provider)}
                      <div>
                        <div className="text-sm text-gray-900 capitalize">{user.loginType}</div>
                        {user.provider && (
                          <div className="text-xs text-gray-500">{user.provider}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.city}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.registeredAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length}{' '}
                results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;
