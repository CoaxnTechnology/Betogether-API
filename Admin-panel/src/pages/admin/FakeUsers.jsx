import React, { useState } from 'react';
import { UserPlus, MapPin, Users, Shuffle, Download, Ban, CheckCircle, Upload } from 'lucide-react';
import citiesData from '../../data/cities.json';
import Papa from 'papaparse';

const FakeUsers = () => {
  const [fakeUsers, setFakeUsers] = useState([
    {
      id: '1',
      name: 'Alex Martinez',
      email: 'alex.martinez.fake@betogether.com',
      city: 'Barcelona',
      country: 'Spain',
      targetAudience: 'tourists',
      createdAt: '2025-01-10T10:30:00Z',
      status: 'active',
    },
    {
      id: '2',
      name: 'Sophie Chen',
      email: 'sophie.chen.fake@betogether.com',
      city: 'Barcelona',
      country: 'Spain',
      targetAudience: 'students',
      createdAt: '2025-01-09T15:45:00Z',
      status: 'active',
    },
  ]);

  const [formData, setFormData] = useState({
    city: 'Barcelona',
    country: 'Spain',
    targetAudience: 'tourists',
    count: 5,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);

  const downloadCSV = () => {
    const csvData = fakeUsers.map(user => ({
      ID: user.id,
      Name: user.name,
      Email: user.email,
      City: user.city,
      Country: user.country,
      'Target Audience': user.targetAudience,
      Status: user.status,
      'Created At': new Date(user.createdAt).toLocaleDateString(),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fake_users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      setImportFile(file);
      setShowImportModal(true);
    }
  };

  const processImportCSV = () => {
    if (!importFile) return;

    Papa.parse(importFile, {
      header: true,
      complete: (results) => {
        const importedUsers = results.data
          .filter(row => row.Name && row.Email && row.City)
          .map((row, index) => ({
            id: Date.now().toString() + index,
            name: row.Name,
            email: row.Email,
            city: row.City || 'Barcelona',
            country: row.Country || 'Spain',
            targetAudience: row['Target Audience'] || 'tourists',
            createdAt: new Date().toISOString(),
            status: row.Status || 'active',
          }));

        setFakeUsers(prev => [...importedUsers, ...prev]);
        setShowImportModal(false);
        setImportFile(null);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        alert('Error parsing CSV file. Please check the format.');
      }
    });
  };

  const toggleUserStatus = (userId) => {
    setFakeUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'active' ? 'blocked' : 'active' }
        : user
    ));
  };

  const targetAudiences = [
    'tourists',
    'students',
    'professionals',
    'locals',
    'expats',
    'digital nomads',
  ];

  const generateRandomName = () => {
    const firstNames = [
      'Alex', 'Maria', 'John', 'Sophie', 'Carlos', 'Emma', 'Marco', 'Lisa',
      'David', 'Anna', 'Pedro', 'Claire', 'Miguel', 'Laura', 'Pablo', 'Sara',
    ];
    const lastNames = [
      'Garcia', 'Smith', 'Rodriguez', 'Johnson', 'Martinez', 'Brown', 'Lopez',
      'Wilson', 'Gonzalez', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White',
    ];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  };

  const generateRandomEmail = (name) => {
    const cleanName = name.toLowerCase().replace(/\s+/g, '.');
    return `${cleanName}.fake@betogether.com`;
  };

  const handleCityChange = (e) => {
    const selectedValue = e.target.value;
    const [city, country] = selectedValue.split('|');
    setFormData(prev => ({ ...prev, city, country }));
  };

  const generateFakeUsers = async () => {
    setIsGenerating(true);
    
    // Simulate generation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newUsers = [];
    
    for (let i = 0; i < formData.count; i++) {
      const name = generateRandomName();
      const user = {
        id: Date.now().toString() + i,
        name,
        email: generateRandomEmail(name),
        city: formData.city,
        country: formData.country,
        targetAudience: formData.targetAudience,
        createdAt: new Date().toISOString(),
        status: 'active',
      };
      newUsers.push(user);
    }
    
    setFakeUsers(prev => [...newUsers, ...prev]);
    setIsGenerating(false);
  };

  const getUsersGroupedByCity = () => {
    const grouped = fakeUsers.reduce((acc, user) => {
      const key = `${user.city}, ${user.country}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(user);
      return acc;
    }, {});
    
    return grouped;
  };

  const groupedUsers = getUsersGroupedByCity();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fake User Creation</h2>
          <p className="text-gray-600">Generate realistic test users for different cities and audiences</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>{fakeUsers.length} fake users created</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Shuffle className="w-4 h-4" />
            <span>Generate Users</span>
          </button>
          <label className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
          </label>
          <button
            onClick={downloadCSV}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Import CSV File
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Selected file: <span className="font-medium">{importFile?.name}</span>
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Expected CSV format:</p>
                <code className="text-xs text-gray-800 dark:text-gray-200">
                  Name, Email, City, Country, Target Audience, Status
                </code>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={processImportCSV}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generation Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Fake Users</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* City Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <select
              value={`${formData.city}|${formData.country}`}
              onChange={handleCityChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {citiesData.map((countryGroup) => (
                <optgroup key={countryGroup.country} label={countryGroup.country}>
                  {countryGroup.cities.map((city) => (
                    <option
                      key={`${city.name}-${countryGroup.country}`}
                      value={`${city.name}|${countryGroup.country}`}
                      className={city.name === 'Barcelona' ? 'font-semibold bg-blue-50' : ''}
                    >
                      {city.name} {city.name === 'Barcelona' ? '(Launch City)' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Audience *
            </label>
            <select
              value={formData.targetAudience}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {targetAudiences.map((audience) => (
                <option key={audience} value={audience} className="capitalize">
                  {audience}
                </option>
              ))}
            </select>
          </div>

          {/* Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Users
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={formData.count}
              onChange={(e) => setFormData(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              onClick={generateFakeUsers}
              disabled={isGenerating}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Shuffle className="w-4 h-4" />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Barcelona Launch Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Initial Launch Configuration</h4>
              <p className="text-sm text-blue-800 mt-1">
                The platform is initially launching in Barcelona to gather user feedback. 
                Additional cities will be enabled in future phases based on user engagement and feedback.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Users by City */}
      <div className="space-y-6">
        {Object.entries(groupedUsers).map(([cityCountry, users]) => (
          <div key={cityCountry} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">{cityCountry}</h3>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                  {users.length} users
                </span>
              </div>
              {cityCountry.includes('Barcelona') && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                  Launch City
                </span>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target Audience
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <UserPlus className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full capitalize">
                          {user.targetAudience}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleUserStatus(user.id)}
                          className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
                            user.status === 'active'
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                          title={user.status === 'active' ? 'Block User' : 'Activate User'}
                        >
                          {user.status === 'active' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FakeUsers;