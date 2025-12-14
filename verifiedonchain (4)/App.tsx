import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { SubmitForm } from './components/SubmitForm';
import { ProfilePage } from './components/ProfilePage';

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/submit" element={<SubmitForm />} />
          <Route path="/u/:username" element={<ProfilePage />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;