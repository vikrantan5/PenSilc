import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, BookOpen, LogOut, Trash2, Edit2 } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchSubjects();
  }, [user, navigate]);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim() || !user) return;

    try {
      const { error } = await supabase.from('subjects').insert({
        name: newSubjectName,
        user_id: user.id,
      });

      if (error) throw error;

      setNewSubjectName('');
      setShowAddModal(false);
      fetchSubjects();
    } catch (error) {
      console.error('Error adding subject:', error);
    }
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject || !newSubjectName.trim()) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .update({ name: newSubjectName })
        .eq('id', editingSubject.id);

      if (error) throw error;

      setEditingSubject(null);
      setNewSubjectName('');
      fetchSubjects();
    } catch (error) {
      console.error('Error updating subject:', error);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject? All notes inside will be deleted.')) return;

    try {
      const { error } = await supabase.from('subjects').delete().eq('id', id);

      if (error) throw error;
      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">PenSilc</h1>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">My Subjects</h2>
            <p className="text-gray-600 mt-1">Organize your notes by subject</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Add Subject</span>
          </button>
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No subjects yet</h3>
            <p className="text-gray-600 mb-6">Create your first subject to start making notes</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
              <span>Add Subject</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer group"
                onClick={() => navigate(`/subject/${subject.id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSubject(subject);
                        setNewSubjectName(subject.name);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubject(subject.id);
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{subject.name}</h3>
                <p className="text-sm text-gray-500">
                  Updated {new Date(subject.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {(showAddModal || editingSubject) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingSubject ? 'Edit Subject' : 'Add New Subject'}
            </h3>
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="Enter subject name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  editingSubject ? handleUpdateSubject() : handleAddSubject();
                }
              }}
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSubject(null);
                  setNewSubjectName('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={editingSubject ? handleUpdateSubject : handleAddSubject}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                {editingSubject ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
