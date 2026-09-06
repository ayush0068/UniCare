'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getFeedback, getFeedbackStats, toggleFeedbackFeatured, deleteFeedback } from '@/lib/admin/api';
import type { Feedback, FeedbackStats } from '@/lib/admin/types';
import {
  Badge, Table, TableRow, Td, ActionButton,
  Pagination, SectionCard, CardHeader, SearchBar,
  FilterSelect, ConfirmModal, EmptyState, toast,
  Avatar,
} from '../common/UI';
import AdminHeader from '../common/Header';
import { fmtDatetime, fmtNumber, cn } from '@/lib/admin/utils';

function StatPill({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-semibold ${color}`}>
      <span>{value}</span>
      <span className="font-normal opacity-70">{label}</span>
    </div>
  );
}

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <i
          key={i}
          className={cn('bi', i < rating ? 'bi-star-fill text-amber-400' : 'bi-star text-slate-200')}
          style={{ fontSize: size }}
        />
      ))}
    </div>
  );
}

const categoryVariant: Record<string, 'blue' | 'purple' | 'orange' | 'teal' | 'gray'> = {
  UI: 'blue',
  Design: 'purple',
  Idea: 'orange',
  Performance: 'teal',
  Other: 'gray',
};

export default function FeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Feedback | null>(null);

  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await getFeedback({
        page: String(page), limit: String(LIMIT),
        ...(search ? { search } : {}),
        ...(ratingFilter !== '' ? { rating: ratingFilter } : {}),
        ...(categoryFilter !== '' ? { category: categoryFilter } : {}),
      });
      setItems(data); setTotal(meta.total);
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [page, search, ratingFilter, categoryFilter]);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await getFeedbackStats();
      setStats(data);
    } catch (e: any) { toast(e.message, 'error'); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [search, ratingFilter, categoryFilter]);

  const handleToggleFeatured = async (item: Feedback) => {
    try {
      await toggleFeedbackFeatured(item._id);
      toast(item.isFeatured ? 'Removed from featured' : 'Marked as featured', 'success');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteFeedback(confirmDelete._id);
      toast('Feedback deleted', 'success');
      load(); loadStats();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const distributionMap = new Map((stats?.distribution ?? []).map((d) => [d._id, d.count]));

  return (
    <>
      <AdminHeader
        title="Feedback & Reviews"
        subtitle="In-app ratings and reviews submitted by patients"
      />
      <div className="pt-16 p-6 space-y-5">
        {/* Quick stats */}
        <div className="flex items-center gap-3 flex-wrap">
          <StatPill label="Total Reviews" value={fmtNumber(stats?.totalFeedback ?? 0)} color="bg-blue-50 text-blue-700 border-blue-200" />
          <StatPill
            label="Average Rating"
            value={
              <span className="flex items-center gap-1.5">
                {stats?.averageRating?.toFixed(1) ?? '0.0'}
                <i className="bi bi-star-fill text-amber-400 text-[12px]" />
              </span>
            }
            color="bg-amber-50 text-amber-700 border-amber-200"
          />
          <StatPill label="Featured" value={fmtNumber(items.filter((i) => i.isFeatured).length)} color="bg-violet-50 text-violet-700 border-violet-200" />
        </div>

        {/* Rating distribution + category breakdown */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard className="p-5">
              <h3 className="text-[13px] font-bold text-slate-800 mb-4">Rating Distribution</h3>
              <div className="space-y-2.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = distributionMap.get(star) ?? 0;
                  const pct = stats.totalFeedback ? Math.round((count / stats.totalFeedback) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-[12px] font-semibold text-slate-500 w-10 flex items-center gap-1">
                        {star} <i className="bi bi-star-fill text-amber-400 text-[10px]" />
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                        />
                      </div>
                      <span className="text-[11.5px] text-slate-400 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard className="p-5">
              <h3 className="text-[13px] font-bold text-slate-800 mb-4">Feedback Categories</h3>
              {stats.categoryBreakdown.length === 0 ? (
                <p className="text-[12.5px] text-slate-400">No categorized feedback yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {stats.categoryBreakdown.map((c) => (
                    <Badge key={c._id} variant={categoryVariant[c._id] ?? 'gray'} className="text-[12px] px-2.5 py-1">
                      {c._id} · {c.count}
                    </Badge>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        )}

        <SectionCard>
          <CardHeader>
            <h3 className="text-[14px] font-bold text-slate-800 mr-auto">All Feedback</h3>
            <SearchBar value={search} onChange={setSearch} placeholder="Search name or message…" />
            <FilterSelect value={ratingFilter} onChange={setRatingFilter} options={[
              { value: '', label: 'All Ratings' },
              { value: '5', label: '5 Stars' },
              { value: '4', label: '4 Stars' },
              { value: '3', label: '3 Stars' },
              { value: '2', label: '2 Stars' },
              { value: '1', label: '1 Star' },
            ]} />
            <FilterSelect value={categoryFilter} onChange={setCategoryFilter} options={[
              { value: '', label: 'All Categories' },
              { value: 'UI', label: 'UI' },
              { value: 'Design', label: 'Design' },
              { value: 'Idea', label: 'Idea' },
              { value: 'Performance', label: 'Performance' },
              { value: 'Other', label: 'Other' },
            ]} />
          </CardHeader>

          <Table
            headers={['Patient', 'Rating', 'Categories', 'Review', 'Submitted', 'Actions']}
            loading={loading} colSpan={6}
          >
            {items.length === 0 && !loading ? (
              <tr><td colSpan={6}><EmptyState icon="bi-chat-heart" title="No feedback yet" desc="Reviews submitted from the app will show up here" /></td></tr>
            ) : items.map((f, i) => (
              <TableRow key={f._id} delay={i * 0.03}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={f.patientName} size={34} />
                    <div>
                      <p className="text-[13.5px] font-semibold text-slate-800 leading-none">{f.patientName || '—'}</p>
                      {f.platform && <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{f.platform}{f.appVersion ? ` · v${f.appVersion}` : ''}</p>}
                    </div>
                  </div>
                </Td>
                <Td><Stars rating={f.rating} /></Td>
                <Td>
                  {f.categories?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {f.categories.map((c) => (
                        <Badge key={c} variant={categoryVariant[c] ?? 'gray'}>{c}</Badge>
                      ))}
                    </div>
                  ) : <span className="text-slate-300">—</span>}
                </Td>
                <Td className="max-w-xs">
                  {f.message ? (
                    <p className="text-[12.5px] text-slate-600 leading-relaxed line-clamp-2">{f.message}</p>
                  ) : <span className="text-slate-300">No comment</span>}
                </Td>
                <Td className="text-slate-400 text-[12.5px] whitespace-nowrap">{fmtDatetime(f.createdAt)}</Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <ActionButton
                      icon={f.isFeatured ? 'bi-star-fill' : 'bi-star'}
                      label={f.isFeatured ? 'Unfeature' : 'Mark as featured'}
                      variant={f.isFeatured ? 'primary' : 'default'}
                      onClick={() => handleToggleFeatured(f)}
                    />
                    <ActionButton
                      icon="bi-trash3"
                      label="Delete"
                      variant="danger"
                      onClick={() => setConfirmDelete(f)}
                    />
                  </div>
                </Td>
              </TableRow>
            ))}
          </Table>

          <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
        </SectionCard>
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Feedback"
        message={`Delete this review from "${confirmDelete?.patientName}"? This cannot be undone.`}
        danger
      />
    </>
  );
}
