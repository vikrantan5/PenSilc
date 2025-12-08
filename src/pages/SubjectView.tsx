import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Plus, FileText, Trash2, Edit2 } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Subject {
  id: string;
  name: string;
}

export function SubjectView() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchSubjectAndNotes();
  }, [user, subjectId, navigate]);

  const fetchSubjectAndNotes = async () => {
    try {
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .maybeSingle();

      if (subjectError) throw subjectError;
      if (!subjectData) {
        navigate('/dashboard');
        return;
      }

      setSubject(subjectData);

      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('subject_id', subjectId)
        .order('updated_at', { ascending: false });

      if (notesError) throw notesError;
      setNotes(notesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteTitle.trim() || !user || !subjectId) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          title: newNoteTitle,
          subject_id: subjectId,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setNewNoteTitle('');
      setShowAddModal(false);
      navigate(`/note/${data.id}`);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !newNoteTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({ title: newNoteTitle })
        .eq('id', editingNote.id);

      if (error) throw error;

      setEditingNote(null);
      setNewNoteTitle('');
      fetchSubjectAndNotes();
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);

      if (error) throw error;
      fetchSubjectAndNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
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
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">{subject?.name}</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Notes</h2>
            <p className="text-gray-600 mt-1">All your notes for {subject?.name}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>New Note</span>
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No notes yet</h3>
            <p className="text-gray-600 mb-6">Create your first note to start writing</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
              <span>New Note</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer group"
                onClick={() => navigate(`/note/${note.id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingNote(note);
                        setNewNoteTitle(note.title);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{note.title}</h3>
                <p className="text-sm text-gray-500">
                  Updated {new Date(note.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {(showAddModal || editingNote) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingNote ? 'Edit Note' : 'Create New Note'}
            </h3>
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Enter note title"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  editingNote ? handleUpdateNote() : handleAddNote();
                }
              }}
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingNote(null);
                  setNewNoteTitle('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={editingNote ? handleUpdateNote : handleAddNote}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                {editingNote ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
