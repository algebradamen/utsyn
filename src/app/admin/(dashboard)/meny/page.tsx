'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { IconCheck, IconX, IconTrash } from '@/components/Icons';

interface MenuItem {
    id: number;
    category_id: number;
    name_no: string;
    name_en: string;
    desc_no: string;
    desc_en: string;
    price: number;
    is_active: boolean;
}

interface MenuCategory {
    id: number;
    name_no: string;
    name_en: string;
    sort_order: number;
    items: MenuItem[];
}

export default function MenyPage() {
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState('');

    const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
    const [addingCategory, setAddingCategory] = useState(false);
    const [newCategory, setNewCategory] = useState({ name_no: '', name_en: '', sort_order: 0 });
    const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({
        isOpen: false,
        message: '',
        onConfirm: () => {}
    });

    const fetchMenu = useCallback(async () => {
        try {
            const res = await fetch('/api/menu');
            const data = await res.json();
            if (Array.isArray(data)) {
                setCategories(data);
            }
        } catch (err) {
            console.error('Error fetching menu:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMenu();
    }, [fetchMenu]);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        try {
            const url = editingItem.id ? `/api/menu/${editingItem.id}` : '/api/menu';
            const method = editingItem.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingItem)
            });

            if (res.ok) {
                showToast(editingItem.id ? 'Rett oppdatert' : 'Rett lagt til');
                setEditingItem(null);
                fetchMenu();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const confirmDeleteItem = (id: number) => {
        setConfirmDialog({
            isOpen: true,
            message: 'Er du sikker på at du vil slette denne retten?',
            onConfirm: () => executeDeleteItem(id)
        });
    };

    const executeDeleteItem = async (id: number) => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
            const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Rett slettet');
                fetchMenu();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/menu/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCategory)
            });

            if (res.ok) {
                showToast('Kategori lagt til');
                setAddingCategory(false);
                setNewCategory({ name_no: '', name_en: '', sort_order: 0 });
                fetchMenu();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const confirmDeleteCategory = (id: number) => {
        setConfirmDialog({
            isOpen: true,
            message: 'Er du sikker på at du vil slette denne kategorien og alle dens retter?',
            onConfirm: () => executeDeleteCategory(id)
        });
    };

    const executeDeleteCategory = async (id: number) => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
            const res = await fetch(`/api/menu/categories/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Kategori slettet');
                fetchMenu();
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    return (
        <>
            <div className="admin-header">
                <h1 className="admin-title">Meny</h1>
                <button className="btn btn-primary" onClick={() => setAddingCategory(true)}>+ Ny Kategori</button>
            </div>

            {addingCategory && (
                <div className="admin-form-section">
                    <h3>Ny Kategori</h3>
                    <form onSubmit={handleSaveCategory} className="admin-form-grid">
                        <div className="form-group">
                            <label className="form-label">Kategorinavn (NO)</label>
                            <input className="form-input" required value={newCategory.name_no} onChange={e => setNewCategory({...newCategory, name_no: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Kategorinavn (EN)</label>
                            <input className="form-input" required value={newCategory.name_en} onChange={e => setNewCategory({...newCategory, name_en: e.target.value})} />
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-md)' }}>
                            <button type="submit" className="btn btn-primary">Lagre</button>
                            <button type="button" className="btn btn-ghost" onClick={() => setAddingCategory(false)}>Avbryt</button>
                        </div>
                    </form>
                </div>
            )}

            {categories.map(cat => (
                <div key={cat.id} className="admin-form-section" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                        <h3>{cat.name_no} <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>({cat.name_en})</span></h3>
                        <div>
                            <button className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }} onClick={() => setEditingItem({ category_id: cat.id, is_active: true, price: 0 })}>
                                + Legg til rett
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => confirmDeleteCategory(cat.id)}>
                                Slett kategori
                            </button>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Navn</th>
                                    <th>Beskrivelse</th>
                                    <th>Pris</th>
                                    <th>Handlinger</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cat.items.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            <span className={`status-badge ${!!item.is_active ? 'status-confirmed' : 'status-cancelled'}`}>
                                                {!!item.is_active ? 'Aktiv' : 'Deaktivert'}
                                            </span>
                                        </td>
                                        <td>
                                            <strong>{item.name_no}</strong><br />
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{item.name_en}</span>
                                        </td>
                                        <td>
                                            <span>{item.desc_no}</span><br />
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{item.desc_en}</span>
                                        </td>
                                        <td>{item.price} kr</td>
                                        <td>
                                            <div className="actions-cell">
                                                <button className="btn btn-secondary btn-sm" onClick={() => setEditingItem(item)}>Rediger</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => confirmDeleteItem(item.id)}>Slett</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {cat.items.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="empty-state" style={{ padding: 'var(--space-md)' }}>Ingen retter i denne kategorien</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}

            {/* Modal for editing item */}
            {editingItem && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <h3>{editingItem.id ? 'Rediger Rett' : 'Ny Rett'}</h3>
                        <form onSubmit={handleSaveItem}>
                            <div className="admin-form-grid" style={{ marginTop: 'var(--space-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">Rettens navn (NO) *</label>
                                    <input className="form-input" required value={editingItem.name_no || ''} onChange={e => setEditingItem({...editingItem, name_no: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Rettens navn (EN) *</label>
                                    <input className="form-input" required value={editingItem.name_en || ''} onChange={e => setEditingItem({...editingItem, name_en: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Beskrivelse (NO)</label>
                                    <textarea className="form-textarea" style={{ minHeight: '80px' }} value={editingItem.desc_no || ''} onChange={e => setEditingItem({...editingItem, desc_no: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Beskrivelse (EN)</label>
                                    <textarea className="form-textarea" style={{ minHeight: '80px' }} value={editingItem.desc_en || ''} onChange={e => setEditingItem({...editingItem, desc_en: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Pris (kr) *</label>
                                    <input className="form-input" type="number" required value={editingItem.price || ''} onChange={e => setEditingItem({...editingItem, price: parseInt(e.target.value) || 0})} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" value={editingItem.is_active ? '1' : '0'} onChange={e => setEditingItem({...editingItem, is_active: e.target.value === '1'})}>
                                        <option value="1">Aktiv</option>
                                        <option value="0">Deaktivert</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setEditingItem(null)}>Avbryt</button>
                                <button type="submit" className="btn btn-primary">Lagre</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
                {toast}
            </div>

            {/* Confirmation Modal */}
            {confirmDialog.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <h3 style={{ marginBottom: 'var(--space-md)' }}>Bekreft handling</h3>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)' }}>
                            {confirmDialog.message}
                        </p>
                        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
                            <button 
                                className="btn btn-ghost" 
                                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                            >
                                Avbryt
                            </button>
                            <button 
                                className="btn btn-danger" 
                                onClick={confirmDialog.onConfirm}
                            >
                                Slett
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .modal-content {
                    background: var(--color-bg-card);
                    padding: var(--space-2xl);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-xl);
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                }
            `}</style>
        </>
    );
}
