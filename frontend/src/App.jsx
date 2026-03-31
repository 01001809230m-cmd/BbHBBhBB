import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import Home from './pages/Home';
import Login from './pages/Login';
import CourseCatalog from './pages/CourseCatalog';
import VideoPlayer from './pages/VideoPlayer';
import AdminDashboard from './pages/admin/AdminDashboard';
import Quizzes from './pages/Quizzes';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import AllCourses from './pages/AllCourses';
import { ThemeProvider } from './context/ThemeProvider';

function App({session}) {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home session={session} />} />
          <Route path="/login" element={session ? <Navigate to="/all-courses" /> : <Login />} />
          <Route path="/all-courses" element={!session ? <Navigate to="/login" /> : <AllCourses />} />
          <Route path="/player" element={!session ? <Navigate to="/login" /> : <VideoPlayer session={session} />} />
          <Route path="/quizzes" element={!session ? <Navigate to="/login" /> : <Quizzes />} />
          <Route path="/reports" element={!session ? <Navigate to="/login" /> : <Reports />} />
          <Route path="/settings" element={!session ? <Navigate to="/login" /> : <Settings />} />
          <Route path="/dashboard" element={!session ? <Navigate to="/login" /> : <AdminDashboard />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

// Ensure the main App file handles state appropriately based on the user session wrapper.
export default function AppWrapper() {
  const [session, setSession] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-emerald-500 font-bold">Loading...</div>
  }

  return <App session={session} />
}
