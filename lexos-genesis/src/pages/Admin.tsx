import React, { useState, useEffect } from 'react';
import { Shield, User, Star, Lock, Unlock, Trash2, Edit2 } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  rating: number;
  permissions: {
    canChat: boolean;
    canViewDashboard: boolean;
    canManageAgents: boolean;
    canAccessAdmin: boolean;
  };
  lastActive: string;
}

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const updateUserPermission = async (userId: number, permission: string, value: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [permission]: value })
      });
      
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update permission:', error);
    }
  };

  const updateUserRating = async (userId: number, rating: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/rating`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      });
      
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update rating:', error);
    }
  };

  const toggleUserStatus = async (userId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <Shield className="mr-3" />
          Admin Panel
        </h1>
      </div>

      {/* Users Table */}
      <div className="bg-gray-900 rounded-lg border border-gray-800">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold">User Management</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left p-4 text-gray-400">User</th>
                <th className="text-left p-4 text-gray-400">Role</th>
                <th className="text-left p-4 text-gray-400">Status</th>
                <th className="text-left p-4 text-gray-400">Rating</th>
                <th className="text-left p-4 text-gray-400">Permissions</th>
                <th className="text-left p-4 text-gray-400">Last Active</th>
                <th className="text-left p-4 text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="p-4">
                    <div className="flex items-center">
                      <User className="mr-3 text-gray-400" size={20} />
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      user.role === 'admin' ? 'bg-purple-600' : 'bg-gray-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleUserStatus(user.id, !user.isActive)}
                      className={`flex items-center px-3 py-1 rounded-full text-sm ${
                        user.isActive ? 'bg-green-600' : 'bg-red-600'
                      }`}
                    >
                      {user.isActive ? (
                        <>
                          <Unlock size={14} className="mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <Lock size={14} className="mr-1" />
                          Locked
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => updateUserRating(user.id, star)}
                          className={`${
                            star <= user.rating ? 'text-yellow-500' : 'text-gray-600'
                          } hover:text-yellow-400 transition-colors`}
                        >
                          <Star size={16} fill={star <= user.rating ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(user.permissions).map(([key, value]) => (
                        <button
                          key={key}
                          onClick={() => updateUserPermission(user.id, key, !value)}
                          className={`px-2 py-1 rounded text-xs ${
                            value ? 'bg-green-600/20 text-green-400' : 'bg-gray-700 text-gray-400'
                          } hover:opacity-80 transition-opacity`}
                        >
                          {key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-gray-400">
                    {new Date(user.lastActive).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 hover:bg-gray-700 rounded transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="p-2 hover:bg-red-600/20 text-red-400 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Settings */}
      <div className="mt-8 bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h2 className="text-xl font-bold mb-4">System Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Max Active Users</label>
              <input
                type="number"
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                defaultValue={100}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Session Timeout (minutes)</label>
              <input
                type="number"
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                defaultValue={30}
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Default User Permissions</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span>Can Chat</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span>Can View Dashboard</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span>Can Manage Agents</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <button className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default Admin;