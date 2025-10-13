import { useState } from 'react';
import { Edit2, Trash2, Mail } from 'lucide-react';
import type { ManagerWithDetails } from '../types';
import { supabase } from '../lib/supabase';

interface ManagerListProps {
  managers: ManagerWithDetails[];
  onManagerUpdate: () => void;
  onEditManager: (manager: ManagerWithDetails) => void;
}

export default function ManagerList({ managers, onManagerUpdate, onEditManager }: ManagerListProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleDeleteManager = async (managerId: string) => {
    if (!confirm('Are you sure you want to delete this manager? This action cannot be undone.')) {
      return;
    }

    setLoading(managerId);
    try {
      // Delete manager record
      const { error: managerError } = await supabase
        .from('managers')
        .delete()
        .eq('id', managerId);

      if (managerError) throw managerError;

      // Delete user record
      const manager = managers.find(m => m.id === managerId);
      if (manager) {
        const { error: userError } = await supabase
          .from('users')
          .delete()
          .eq('id', manager.user_id);

        if (userError) throw userError;
      }

      onManagerUpdate();
    } catch (error) {
      console.error('Error deleting manager:', error);
      alert('Failed to delete manager');
    } finally {
      setLoading(null);
    }
  };

  if (managers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No managers found</p>
        <p className="text-sm text-gray-400 mt-1">Create your first manager to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Manager
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {managers.map((manager) => (
            <tr key={manager.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-medium text-sm">
                      {manager.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {manager.full_name}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {manager.user?.email || 'No email'}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(manager.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEditManager(manager)}
                    className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded"
                    title="Edit manager"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteManager(manager.id)}
                    disabled={loading === manager.id}
                    className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded disabled:opacity-50"
                    title="Delete manager"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}