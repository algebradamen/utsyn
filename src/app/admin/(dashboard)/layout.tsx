'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { IconChartBar, IconClipboard, IconSettings, IconUsers, IconLogOut, IconCalendar, IconGrid } from '@/components/Icons';
import A11yToolbar from '@/components/A11yToolbar';

interface User {
  userId: number;
  username: string;
  role: string;
}

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => {
        if (!r.ok) throw new Error('Not authenticated');
        return r.json();
      })
      .then(data => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        router.push('/admin');
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/admin');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const isActive = (path: string) => pathname === path;

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <img src="/utsyn_logo.png" alt="Restaurant Utsyn Logo" className="logo-img" />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              {user?.username} ({user?.role})
            </span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout} aria-label="Logg ut">
              <IconLogOut size={16} />
              <span>Logg ut</span>
            </button>
          </div>
        </div>
      </header>
      <div className="admin-layout">
        <aside className="admin-sidebar" role="navigation" aria-label="Admin-navigasjon">
          <Link
            href="/admin/dashboard"
            className={`admin-sidebar-link ${isActive('/admin/dashboard') ? 'active' : ''}`}
          >
            <span className="admin-sidebar-link-icon"><IconChartBar size={18} /></span>
            Oversikt
          </Link>
          <Link
            href="/admin/reservasjoner"
            className={`admin-sidebar-link ${isActive('/admin/reservasjoner') ? 'active' : ''}`}
          >
            <span className="admin-sidebar-link-icon"><IconCalendar size={18} /></span>
            Reservasjoner
          </Link>
          <Link
            href="/admin/bord"
            className={`admin-sidebar-link ${isActive('/admin/bord') ? 'active' : ''}`}
          >
            <span className="admin-sidebar-link-icon"><IconGrid size={18} /></span>
            Bordkart
          </Link>
          <Link
            href="/admin/meny"
            className={`admin-sidebar-link ${isActive('/admin/meny') ? 'active' : ''}`}
          >
            <span className="admin-sidebar-link-icon"><IconClipboard size={18} /></span>
            Meny
          </Link>
          <Link
            href="/admin/innstillinger"
            className={`admin-sidebar-link ${isActive('/admin/innstillinger') ? 'active' : ''}`}
          >
            <span className="admin-sidebar-link-icon"><IconSettings size={18} /></span>
            Innstillinger
          </Link>
          {user?.role === 'admin' && (
            <Link
              href="/admin/brukere"
              className={`admin-sidebar-link ${isActive('/admin/brukere') ? 'active' : ''}`}
            >
              <span className="admin-sidebar-link-icon"><IconUsers size={18} /></span>
              Brukere
            </Link>
          )}
        </aside>
        <main className="admin-main">
          {children}
        </main>
      </div>
      <A11yToolbar />
    </>
  );
}
