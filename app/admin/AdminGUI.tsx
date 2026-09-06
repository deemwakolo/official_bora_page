'use client';

import React from 'react';

import Header from './admin-GUI/Header';
import AdminShell from './admin-GUI/AdminShell';
import Footer from './admin-GUI/Footer';

export default function AdminGUI() {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >
      <Header />

      <AdminShell />

      <Footer />
    </div>
  );
}