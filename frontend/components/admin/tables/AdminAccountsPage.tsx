'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  getAdmins, createAdmin as apiCreateAdmin,
  updateAdminPermissions, toggleAdminActive, deleteAdmin,
} from '@/lib/admin/api';
import type { AdminUser } from '@/lib/admin/types';
import {
  Badge, Table, TableRow, Td, ActionButton, SectionCard,
  CardHeader, Modal, ConfirmModal, EmptyState, toast,
  Button, FormField, inputClass,
} from '../common/UI';
import AdminHeader from '../common/Header';
import { useAdminStore } from '@/lib/admin/store';
import { fmtDatetime } from '@/lib/admin/utils';

const PERMS = [
  { key: 'userManagement',    label: 'User Management',    icon: 'bi-people-fill',           desc: 'View and manage patients' },
  { key: 'doctorManagement',  label: 'Doctor Management',  icon: 'bi-hospital-fill',          desc: 'Verify and manage doctors' },
  { key: 'paymentManagement', label: 'Payment Management', icon: 'bi-credit-card-2-front-fill', desc: 'View transactions & revenue' },
  { key: 'analytics',         label: 'Analytics',          icon: 'bi-bar-chart-fill',         desc: 'Dashboard stats & reports' },
] as const;

type PermKey = typeof PERMS[number]['key'];

function PermCheckbox({ pKey, label, icon, desc, checked, onChange }: {
  pKey: string; label: string; icon: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <motion.label
      whileHover={{ scale: 1.01 }}
      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
        checked ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
      }`}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${checked ? 'bg-blue-600' : 'bg-white border border-slate-200'}`}>
        <i className={`bi ${icon} text-sm ${checked ? 'text-white' : 'text-slate-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-semibold ${checked ? 'text-blue-800' : 'text-slate-700'}`}>{label}</p>
        <p className="text-[11.5px] text-slate-400">{desc}</p>
      </div>
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
        {checked && <i className="bi bi-check2 text-white text-[11px]" />}
      </div>
    </motion.label>
  );
}

export default function AdminAccountsPage() {
  const { admin: currentAdmin } = useAdminStore();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', pass: '', role: 'admin' });
  const [formPerms, setFormPerms] = useState<Record<PermKey, boolean>>({
    userManagement: false, doctorManagement: false, paymentManagement: false, analytics: false,
  });
  const [creating, setCreating] = useState(false);

  // Edit perms modal
  const [editOpen, setEditOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null);
  const [editPerms, setEditPerms] = useState<Record<PermKey, boolean>>({
    userManagement: false, doctorManagement: false, paymentManagement: false, analytics: false,
  });
  const [saving, setSaving] = useState(false);

  // Confirm
  const [confirm, setConfirm] = useState<{ id: string; name: string; type: 'toggle' | 'delete'; isActive?: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await getAdmins(); setAdmins(data); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.pass) { toast('Name, email and password are required', 'error'); return; }
    setCreating(true);
    try {
      await apiCreateAdmin({ ...form, permissions: formPerms });
      toast('Admin created successfully', 'success');
      setCreateOpen(false);
      setForm({ name: '', email: '', pass: '', role: 'admin' });
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setCreating(false); }
  };

  const handleSavePerms = async () => {
    if (!editAdmin) return;
    setSaving(true);
    try {
      await updateAdminPermissions(editAdmin.id, editPerms);
      toast('Permissions updated', 'success');
      setEditOpen(false);
      load();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.type === 'toggle') {
        await toggleAdminActive(confirm.id);
        toast(`Admin ${confirm.isActive ? 'deactivated' : 'activated'}`, 'success');
      } else {
        await deleteAdmin(confirm.id);
        toast('Admin deleted', 'success');
      }
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const openEdit = (a: AdminUser) => {
    setEditAdmin(a);
    setEditPerms({ ...formPerms, ...(a.permissions as any) });
    setEditOpen(true);
  };

  return (
    <>
      <AdminHeader
        title="Admin Accounts"
        subtitle="Manage admin users and their permissions"
        actions={
          <Button variant="primary" icon="bi-plus-lg" onClick={() => { setCreateOpen(true); setForm({ name: '', email: '', pass: '', role: 'admin' }); }}>
            Create Admin
          </Button>
        }
      />
      <div className="pt-16 p-6">
        <SectionCard>
          <CardHeader>
            <h3 className="text-[14px] font-bold text-slate-800 mr-auto">All Admins</h3>
            <span className="text-[12px] font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">{admins.length} total</span>
          </CardHeader>

          <Table headers={['Admin', 'Role', 'Permissions', 'Last Login', 'Status', 'Actions']} loading={loading} colSpan={6}>
            {admins.length === 0 && !loading ? (
              <tr><td colSpan={6}><EmptyState icon="bi-shield-lock" title="No admin accounts found" /></td></tr>
            ) : admins.map((a, i) => {
              const isMe = a.id === currentAdmin?.id;
              const permList = PERMS.filter((p) => a.permissions?.[p.key]);
              return (
                <TableRow key={a.id} delay={i * 0.04}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px] flex-shrink-0 ${
                        a.role === 'super_admin'
                          ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                          : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                      }`}>
                        {a.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13.5px] font-semibold text-slate-800">{a.name} {isMe && <span className="text-[11px] text-slate-400">(You)</span>}</p>
                        <p className="text-[12px] text-slate-400">{a.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={a.role === 'super_admin' ? 'purple' : 'blue'}
                      icon={a.role === 'super_admin' ? 'bi-stars' : 'bi-person-gear'}>
                      {a.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </Td>
                  <Td>
                    {a.role === 'super_admin' ? (
                      <Badge variant="purple" icon="bi-infinity">All Access</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {permList.length === 0
                          ? <span className="text-slate-300 text-[12px]">No permissions</span>
                          : permList.map((p) => (
                            <Badge key={p.key} variant="gray" icon={p.icon}>
                              {p.label.split(' ')[0]}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </Td>
                  <Td className="text-[12.5px] text-slate-400 whitespace-nowrap">{fmtDatetime(a.lastLogin) || '—'}</Td>
                  <Td>
                    <Badge variant={a.isActive ? 'green' : 'gray'} icon={a.isActive ? 'bi-circle-fill' : 'bi-circle'}>
                      {a.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  <Td>
                    {isMe ? (
                      <span className="text-[12px] text-slate-300 italic">—</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <ActionButton icon="bi-pencil" label="Edit Permissions" variant="default" onClick={() => openEdit(a)} />
                        <ActionButton
                          icon={a.isActive ? 'bi-slash-circle' : 'bi-check-circle'}
                          label={a.isActive ? 'Deactivate' : 'Activate'}
                          variant={a.isActive ? 'danger' : 'success'}
                          onClick={() => setConfirm({ id: a.id, name: a.name, type: 'toggle', isActive: a.isActive })}
                        />
                        <ActionButton
                          icon="bi-trash3" label="Delete" variant="danger"
                          onClick={() => setConfirm({ id: a.id, name: a.name, type: 'delete' })}
                        />
                      </div>
                    )}
                  </Td>
                </TableRow>
              );
            })}
          </Table>
        </SectionCard>
      </div>

      {/* Create Admin Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Admin" width="max-w-xl"
        footer={<>
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="primary" icon="bi-plus-circle" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : 'Create Admin'}
          </Button>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name" required>
              <input className={inputClass} placeholder="Dr. Jane Smith" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Email Address" required>
              <input className={inputClass} type="email" placeholder="admin@unicare.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Password" required>
              <input className={inputClass} type="password" placeholder="Min 6 characters" value={form.pass} onChange={(e) => setForm((f) => ({ ...f, pass: e.target.value }))} />
            </FormField>
            <FormField label="Role">
              <select className={inputClass} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </FormField>
          </div>
          {form.role === 'admin' && (
            <FormField label="Permissions">
              <div className="grid grid-cols-2 gap-2 mt-1">
                {PERMS.map((p) => (
                  <PermCheckbox key={p.key} pKey={p.key} label={p.label} icon={p.icon} desc={p.desc}
                    checked={formPerms[p.key]} onChange={(v) => setFormPerms((prev) => ({ ...prev, [p.key]: v }))} />
                ))}
              </div>
            </FormField>
          )}
          {form.role === 'super_admin' && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-violet-50 border border-violet-200 rounded-xl text-[12.5px] text-violet-700">
              <i className="bi bi-stars text-violet-500" />
              Super admin has unrestricted access to all features.
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Permissions Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Permissions" width="max-w-xl"
        footer={<>
          <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="primary" icon="bi-floppy2" onClick={handleSavePerms} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </>}
      >
        {editAdmin && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-white text-[13px]">
                {editAdmin.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-[13.5px] font-bold text-slate-800">{editAdmin.name}</p>
                <p className="text-[12px] text-slate-400">{editAdmin.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PERMS.map((p) => (
                <PermCheckbox key={p.key} pKey={p.key} label={p.label} icon={p.icon} desc={p.desc}
                  checked={editPerms[p.key]} onChange={(v) => setEditPerms((prev) => ({ ...prev, [p.key]: v }))} />
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm */}
      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title={confirm?.type === 'delete' ? 'Delete Admin' : (confirm?.isActive ? 'Deactivate Admin' : 'Activate Admin')}
        message={confirm?.type === 'delete'
          ? `Permanently delete "${confirm?.name}"? This cannot be undone.`
          : `${confirm?.isActive ? 'Deactivate' : 'Activate'} admin "${confirm?.name}"?`}
        danger={confirm?.type === 'delete' || confirm?.isActive}
      />
    </>
  );
}
