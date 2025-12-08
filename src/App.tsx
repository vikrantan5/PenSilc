import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { SubjectView } from './pages/SubjectView';
import { NoteEditor } from './pages/NoteEditor';
import { SharedNote } from './pages/SharedNote';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subject/:subjectId"
            element={
              <ProtectedRoute>
                <SubjectView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/note/:noteId"
            element={
              <ProtectedRoute>
                <NoteEditor />
              </ProtectedRoute>
            }
          />
          <Route path="/shared/:shareId" element={<SharedNote />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
