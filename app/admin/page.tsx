'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { apiService } from '@/lib/api';
import { clearStationsCache } from '@/hooks/useStations';
import type { Station } from '@/types/Station';
import Link from 'next/link';
import { Plus, Edit2, Trash2, Radio, X, Check, AlertTriangle, ChevronDown, ArrowLeft, BarChart2 } from 'lucide-react';

const GENRES = ['Pop', 'Soul', 'Hip Hop', 'Urban', 'Contemporary', 'Talk', 'News', 'Dance'];

const emptyForm = (): Partial<Station> => ({
    name: '', description: '', url: '', genre: 'Pop',
    region: 'Nairobi', frequency: '', language: 'English',
    is_active: true, is_live: true,
});

const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm';
const inputStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    outline: 'none',
} as const;

export default function AdminPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    const [stations, setStations] = useState<Station[]>([]);
    const [fetching, setFetching] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | 'new' | null>(null);
    const [form, setForm] = useState<Partial<Station>>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Station | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchStations = useCallback(async () => {
        setFetching(true);
        setFetchError(null);
        const res = await apiService.getAllStations();
        if (res.data) {
            setStations(res.data.stations);
        } else {
            setFetchError(res.error ?? 'Failed to load stations');
        }
        setFetching(false);
    }, []);

    useEffect(() => {
        if (!loading && !user?.is_admin) router.replace('/');
    }, [user, loading, router]);

    useEffect(() => {
        if (user?.is_admin) fetchStations();
    }, [user, fetchStations]);

    const startEdit = (station: Station) => {
        setForm({ ...station });
        setEditingId(station.id);
        setFormError(null);
    };

    const startNew = () => {
        setForm(emptyForm());
        setEditingId('new');
        setFormError(null);
    };

    const cancel = () => { setEditingId(null); setFormError(null); };

    const save = async () => {
        setSaving(true);
        setFormError(null);
        const res = editingId === 'new'
            ? await apiService.createStation(form)
            : await apiService.updateStation(editingId as number, form);
        setSaving(false);
        if (res.error) {
            setFormError(res.error);
        } else {
            clearStationsCache();
            router.refresh();
            setEditingId(null);
            fetchStations();
        }
    };

    const confirmAndDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        await apiService.deleteStation(confirmDelete.id);
        setDeleting(false);
        setConfirmDelete(null);
        clearStationsCache();
        router.refresh();
        fetchStations();
    };

    const toggleField = async (station: Station, field: 'is_active' | 'is_live') => {
        await apiService.updateStation(station.id, { [field]: !station[field] });
        clearStationsCache();
        router.refresh();
        fetchStations();
    };

    if (loading || (!user?.is_admin && !loading)) return null;

    /* ── helpers ── */
    const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
        <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                {label}{required && <span className="ml-0.5" style={{ color: '#f87171' }}>*</span>}
            </label>
            {children}
        </div>
    );

    const SectionLabel = ({ children }: { children: React.ReactNode }) => (
        <p className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.07em' }}>{children}</p>
    );

    const inp = `${inputCls} focus:outline-none`;

    return (
        <Layout>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24">

                {editingId !== null ? (
                    /* ══════════════════ FORM VIEW ══════════════════ */
                    <>
                        {/* Back bar */}
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={cancel}
                                className="flex items-center gap-1.5 text-sm"
                                style={{ color: 'var(--color-text-muted)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to stations
                            </button>
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                {editingId === 'new' ? 'New station' : `Editing station #${editingId}`}
                            </p>
                        </div>

                        {/* Card — full width */}
                        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-strong)' }}>

                            {/* Card header */}
                            <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                    {editingId === 'new' ? 'Add Station' : form.name}
                                </h2>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                    {editingId === 'new' ? 'Fill in the details below to add a new radio station.' : 'Update station details below.'}
                                </p>
                            </div>

                            <div className="px-6 py-6 space-y-5">

                                {/* Row 1 — 3 cols: Name | Genre | Region */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Field label="Station Name" required>
                                        <input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} style={inputStyle} placeholder="e.g. Capital FM" />
                                    </Field>
                                    <Field label="Genre">
                                        <div className="relative">
                                            <select
                                                value={form.genre ?? 'Pop'}
                                                onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                                                className={`${inp} appearance-none pr-9`}
                                                style={{ ...inputStyle, WebkitAppearance: 'none' }}
                                            >
                                                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                                        </div>
                                    </Field>
                                    <Field label="Region">
                                        <input value={form.region ?? ''} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} className={inp} style={inputStyle} placeholder="e.g. Nairobi" />
                                    </Field>
                                </div>

                                {/* Row 2 — 3 cols: Language | Frequency | Logo URL */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Field label="Language">
                                        <input value={form.language ?? ''} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} className={inp} style={inputStyle} placeholder="e.g. English" />
                                    </Field>
                                    <Field label="Frequency">
                                        <input value={form.frequency ?? ''} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} className={inp} style={inputStyle} placeholder="e.g. 98.4 FM" />
                                    </Field>
                                    <Field label="Logo URL">
                                        <input value={form.logo_url ?? ''} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} className={inp} style={inputStyle} placeholder="https://..." type="url" />
                                    </Field>
                                </div>

                                {/* Row 3 — full width: Stream URL */}
                                <Field label="Stream URL" required>
                                    <input value={form.url ?? ''} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className={inp} style={inputStyle} placeholder="https://stream.example.com/live" type="url" />
                                </Field>

                                {/* Row 4 — Description (2/3) + Status toggles (1/3) */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                                    <div className="sm:col-span-2">
                                        <Field label="Description">
                                            <textarea
                                                value={form.description ?? ''}
                                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                                rows={4}
                                                className={`${inp} resize-none`}
                                                style={{ ...inputStyle, lineHeight: '1.6' }}
                                                placeholder="Short description of the station…"
                                            />
                                        </Field>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Status</p>
                                        <div className="flex gap-2">
                                        {([
                                            { field: 'is_active' as const, label: 'Active', description: 'Shown on homepage' },
                                            { field: 'is_live' as const, label: 'Live', description: 'Stream is playable' },
                                        ]).map(({ field, label, description }) => {
                                            const on = form[field] ?? true;
                                            return (
                                                <button
                                                    key={field}
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={on}
                                                    onClick={() => setForm(f => ({ ...f, [field]: !(f[field] ?? true) }))}
                                                    className="flex items-center justify-between flex-1 px-3.5 py-2 rounded-xl text-left"
                                                    style={{
                                                        background: on ? 'rgba(99,102,241,0.06)' : 'var(--color-surface)',
                                                        border: `1px solid ${on ? 'rgba(99,102,241,0.3)' : 'var(--color-border)'}`,
                                                        cursor: 'pointer',
                                                        transition: 'background 180ms ease, border-color 180ms ease',
                                                    }}
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
                                                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{description}</p>
                                                    </div>
                                                    <div className="relative shrink-0 ml-4" style={{ width: '40px', height: '22px' }}>
                                                        <div style={{ width: '40px', height: '22px', borderRadius: '11px', background: on ? '#6366f1' : 'var(--color-border-strong)', transition: 'background 180ms ease' }} />
                                                        <div style={{ position: 'absolute', top: '3px', left: on ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transition: 'left 180ms ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        </div>
                                    </div>
                                </div>

                                {/* Error */}
                                {formError && (
                                    <p className="text-xs px-3 py-2.5 rounded-xl" style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                                        {formError}
                                    </p>
                                )}
                            </div>

                            {/* Footer actions */}
                            <div className="flex items-center gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                                <button
                                    onClick={save}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white', opacity: saving ? 0.65 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
                                >
                                    <Check className="w-4 h-4" />
                                    {saving ? 'Saving…' : editingId === 'new' ? 'Add Station' : 'Save Changes'}
                                </button>
                                <button
                                    onClick={cancel}
                                    className="px-4 py-2.5 rounded-xl text-sm"
                                    style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </>

                ) : (
                    /* ══════════════════ LIST VIEW ══════════════════ */
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                                    <Radio style={{ width: '1.125rem', height: '1.125rem', color: 'white' }} />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Admin Panel</h1>
                                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                        {fetching ? 'Loading…' : `${stations.length} station${stations.length !== 1 ? 's' : ''}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/admin/analytics"
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium"
                                    style={{
                                        background: 'var(--color-surface-raised)',
                                        color: 'var(--color-text-secondary)',
                                        border: '1px solid var(--color-border)',
                                    }}
                                >
                                    <BarChart2 className="w-4 h-4" />
                                    Analytics
                                </Link>
                                <button
                                    onClick={startNew}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white' }}
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Station
                                </button>
                            </div>
                        </div>

                        {/* Delete confirm */}
                        {confirmDelete && (
                            <div className="mb-6 rounded-2xl p-5 flex items-start gap-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)' }}>
                                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#f87171' }} />
                                <div className="flex-1">
                                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Delete &ldquo;{confirmDelete.name}&rdquo;?</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>This cannot be undone.</p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <button onClick={confirmAndDelete} disabled={deleting} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: '#ef4444', color: 'white', opacity: deleting ? 0.6 : 1 }}>
                                            {deleting ? 'Deleting…' : 'Yes, delete'}
                                        </button>
                                        <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Station list */}
                        {fetching ? (
                            <div className="space-y-2">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
                                ))}
                            </div>
                        ) : fetchError ? (
                            <div className="rounded-xl px-4 py-6 text-center" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
                                <p className="text-sm" style={{ color: '#f87171' }}>{fetchError}</p>
                                <button onClick={fetchStations} className="mt-3 text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>Retry</button>
                            </div>
                        ) : stations.length === 0 ? (
                            <div className="rounded-xl px-4 py-10 text-center" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
                                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No stations yet. Add one to get started.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                                {stations.map(station => (
                                    <div
                                        key={station.id}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl"
                                        style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', opacity: station.is_active ? 1 : 0.55 }}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{station.name}</p>
                                            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                                {station.genre} · {station.region}{station.frequency ? ` · ${station.frequency}` : ''}{station.total_plays ? ` · ${station.total_plays.toLocaleString()} plays` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button onClick={() => toggleField(station, 'is_live')} className="px-2 py-1 rounded-md text-xs font-medium" style={{ background: station.is_live ? 'rgba(74,222,128,0.12)' : 'var(--color-surface)', color: station.is_live ? '#4ade80' : 'var(--color-text-muted)', border: `1px solid ${station.is_live ? 'rgba(74,222,128,0.3)' : 'var(--color-border)'}` }}>LIVE</button>
                                            <button onClick={() => toggleField(station, 'is_active')} className="px-2 py-1 rounded-md text-xs font-medium" style={{ background: station.is_active ? 'rgba(99,102,241,0.12)' : 'var(--color-surface)', color: station.is_active ? '#6366f1' : 'var(--color-text-muted)', border: `1px solid ${station.is_active ? 'rgba(99,102,241,0.3)' : 'var(--color-border)'}` }}>{station.is_active ? 'Active' : 'Inactive'}</button>
                                            <button onClick={() => startEdit(station)} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }} aria-label="Edit station" onMouseEnter={e => (e.currentTarget.style.color = '#6366f1')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setConfirmDelete(station)} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }} aria-label="Delete station" onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
        </Layout>
    );
}
