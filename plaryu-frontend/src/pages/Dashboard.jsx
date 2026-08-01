import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getAllBatches, mintBatch, transferBatch, verifyBatch, getGlobalLedger } from '../services/batchService';
import { closeRecyclingLoop } from '../services/recyclingService';
import { listUsers, verifyUser, unverifyUser, seedDemoData } from '../services/adminService';
import { hashFile, getCurrentLocation } from '../utils/proof';

const STATUS_COLORS = {
  CREATED: 'bg-slate-100 text-slate-700',
  IN_TRANSIT: 'bg-amber-100 text-amber-700',
  RETAIL: 'bg-blue-100 text-blue-700',
  WITH_CONSUMER: 'bg-purple-100 text-purple-700',
  DISCARDED: 'bg-orange-100 text-orange-700',
  COLLECTED: 'bg-cyan-100 text-cyan-700',
  RECYCLED: 'bg-green-100 text-green-700',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // form state, reused across role actions
  const [materialType, setMaterialType] = useState('PET');
  const [weightKg, setWeightKg] = useState('');
  const [batchId, setBatchId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [weightProcessedKg, setWeightProcessedKg] = useState('');
  const [proofPhoto, setProofPhoto] = useState(null);
  const [proofSubmitting, setProofSubmitting] = useState(false);

  // admin-only state
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // global live ledger feed
  const [ledger, setLedger] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(true);

  async function loadLedger() {
    try {
      const data = await getGlobalLedger();
      setLedger(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLedger(false);
    }
  }

  async function handleSeedDemoData() {
    resetMessages();
    setSeeding(true);
    try {
      const result = await seedDemoData();
      setActionMessage(`Seeded: ${result.batchesMinted} batches minted, ${result.transfersRecorded} transfers, ${result.recyclingLoopsClosed} loops closed`);
      loadBatches();
      loadLedger();
      loadUsers();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Seeding failed');
    } finally {
      setSeeding(false);
    }
  }

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const data = await listUsers();
      setAllUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadBatches() {
    setLoadingBatches(true);
    try {
      const data = await getAllBatches();
      setBatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBatches(false);
    }
  }

  useEffect(() => {
    loadBatches();
    loadLedger();
    // real-time-ish refresh: re-poll the ledger every 8s so multiple
    // browser tabs/users see batch moves without a manual refresh
    const interval = setInterval(() => {
      loadBatches();
      loadLedger();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadUsers();
    }
  }, [user]);

  function resetMessages() {
    setActionMessage('');
    setActionError('');
  }

  async function handleMint(e) {
    e.preventDefault();
    resetMessages();
    try {
      const batch = await mintBatch(user.userId, { materialType, weightKg: Number(weightKg) });
      setActionMessage(`Minted batch ${batch.batchCode}`);
      setWeightKg('');
      loadBatches();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Mint failed');
    }
  }

  async function handleTransfer(e) {
    e.preventDefault();
    resetMessages();
    try {
      const batch = await transferBatch({ batchId: Number(batchId), toUserId: Number(toUserId) });
      setActionMessage(`Transferred batch ${batch.batchCode} → now ${batch.status}`);
      setBatchId('');
      setToUserId('');
      loadBatches();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Transfer failed');
    }
  }

  async function handleCloseLoop(e) {
    e.preventDefault();
    resetMessages();
    if (!proofPhoto) {
      setActionError('Please attach a photo as evidence of the processed batch.');
      return;
    }
    setProofSubmitting(true);
    try {
      const proofPhotoHash = await hashFile(proofPhoto);
      const location = await getCurrentLocation();
      const record = await closeRecyclingLoop(user.userId, {
        batchId: Number(batchId),
        weightProcessedKg: Number(weightProcessedKg),
        proofPhotoHash,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });
      setActionMessage(`Recycling closed — certificate ${record.certificateId} (proof hash bound: ${proofPhotoHash.slice(0, 12)}…)`);
      setBatchId('');
      setWeightProcessedKg('');
      setProofPhoto(null);
      loadBatches();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Recycling closure failed');
    } finally {
      setProofSubmitting(false);
    }
  }

  async function handleVerifyUser(userId) {
    resetMessages();
    try {
      await verifyUser(userId);
      setActionMessage(`User #${userId} facility verified`);
      loadUsers();
    } catch (err) {
      setActionError('Verification failed');
    }
  }

  async function handleUnverifyUser(userId) {
    resetMessages();
    try {
      await unverifyUser(userId);
      setActionMessage(`User #${userId} verification revoked`);
      loadUsers();
    } catch (err) {
      setActionError('Action failed');
    }
  }

  async function handleVerify(id) {
    resetMessages();
    try {
      const result = await verifyBatch(id);
      setActionMessage(`Batch #${id} chain intact: ${result.chainIntact ? 'YES ✅' : 'NO ⚠️ TAMPERED'}`);
    } catch (err) {
      setActionError('Verification failed');
    }
  }

  const totalWeight = batches.reduce((sum, b) => sum + (b.weightKg || 0), 0);
  const recycledCount = batches.filter((b) => b.status === 'RECYCLED').length;
  const circularityRate = batches.length ? ((recycledCount / batches.length) * 100).toFixed(1) : '0.0';

  // material breakdown for the donut chart
  const materialTotals = batches.reduce((acc, b) => {
    acc[b.materialType] = (acc[b.materialType] || 0) + b.weightKg;
    return acc;
  }, {});
  const materialData = Object.entries(materialTotals).map(([name, value]) => ({ name, value }));
  const MATERIAL_COLORS = { PET: '#2a9d93', HDPE: '#3fb8ae', LDPE: '#f59e0b', PP: '#8b5cf6', PS: '#ef4444', OTHER: '#94a3b8' };

  // status distribution for the bar chart
  const statusTotals = batches.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusTotals).map(([name, count]) => ({ name, count }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* top bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z" />
              <circle cx="12" cy="11" r="2.2" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-slate-900 leading-none">Plaryu</div>
            <div className="text-xs text-slate-400">Ledger v0.1</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-900">{user?.name}</div>
            <div className="text-xs text-slate-500 flex items-center justify-end gap-1">
              {user?.role}
              {['MANUFACTURER', 'RECYCLER'].includes(user?.role) && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${user?.verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {user?.verified ? 'Verified ✓' : 'Unverified'}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={logout}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Batches" value={batches.length} />
          <StatCard label="Total Weight Tracked" value={`${totalWeight.toFixed(1)} kg`} />
          <StatCard label="Circularity Rate" value={`${circularityRate}%`} accent />
        </div>

        {(actionMessage || actionError) && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg text-sm ${
              actionError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            {actionError || actionMessage}
          </div>
        )}

        {/* charts */}
        {batches.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 mb-4">Material Breakdown (by weight)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={materialData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {materialData.map((entry) => (
                      <Cell key={entry.name} fill={MATERIAL_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(1)} kg`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 mb-4">Batches by Lifecycle Stage</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2a9d93" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* global live ledger feed — every transfer across every batch */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Live Ledger</h2>
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Streaming
            </span>
          </div>
          {loadingLedger ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : ledger.length === 0 ? (
            <p className="text-sm text-slate-400">
              No activity yet.{user?.role === 'ADMIN' ? ' Use "Seed Demo Data" below to populate the ledger.' : ''}
            </p>
          ) : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="pb-2 font-medium">Hash</th>
                    <th className="pb-2 font-medium">Batch</th>
                    <th className="pb-2 font-medium">Material</th>
                    <th className="pb-2 font-medium">Move</th>
                    <th className="pb-2 font-medium">Current Owner</th>
                    <th className="pb-2 font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry) => (
                    <tr key={entry.transferId} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 font-mono text-xs text-slate-500">
                        {entry.currentHash.slice(0, 8)}…
                      </td>
                      <td className="py-2 font-mono text-xs">
                        <Link to={`/batch/${entry.batchId}`} className="text-brand-600 hover:underline">
                          {entry.batchCode}
                        </Link>
                      </td>
                      <td className="py-2 text-slate-600">{entry.materialType}</td>
                      <td className="py-2">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {entry.fromRole === 'GENESIS' ? 'Minted' : `${entry.fromRole} → ${entry.toRole}`}
                        </span>
                      </td>
                      <td className="py-2 text-slate-600">{entry.currentOwnerName}</td>
                      <td className="py-2 text-slate-400 text-xs">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ledger table */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 mb-4">Batch Ledger</h2>
            {loadingBatches ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : batches.length === 0 ? (
              <p className="text-sm text-slate-400">No batches yet — mint one to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-100">
                      <th className="pb-2 font-medium">Batch Code</th>
                      <th className="pb-2 font-medium">Material</th>
                      <th className="pb-2 font-medium">Weight</th>
                      <th className="pb-2 font-medium">Owner</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((b) => (
                      <tr key={b.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2.5 font-mono text-xs">
                          <Link to={`/batch/${b.id}`} className="text-brand-600 hover:underline">
                            {b.batchCode}
                          </Link>
                        </td>
                        <td className="py-2.5 text-slate-600">{b.materialType}</td>
                        <td className="py-2.5 text-slate-600">{b.weightKg} kg</td>
                        <td className="py-2.5 text-slate-600">{b.currentOwnerName}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] || 'bg-slate-100'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <button
                            onClick={() => handleVerify(b.id)}
                            className="text-xs text-brand-600 hover:underline"
                          >
                            Verify chain
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* role action panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 mb-1">Role Actions</h2>
            <p className="text-xs text-slate-400 mb-4">{user?.role}</p>

            {user?.role === 'MANUFACTURER' && (
              <>
                {!user?.verified && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    This facility isn't verified yet. An admin must verify it before you can mint batches.
                  </p>
                )}
                <form onSubmit={handleMint} className="space-y-3">
                  <p className="text-sm font-semibold text-slate-700">Mint New Plastic Batch</p>
                  <SelectField label="Material type" value={materialType} onChange={setMaterialType}
                    options={['PET', 'HDPE', 'LDPE', 'PP', 'PS', 'OTHER']} />
                  <TextField label="Weight (kg)" type="number" value={weightKg} onChange={setWeightKg} required />
                  <SubmitButton disabled={!user?.verified}>Sign &amp; Mint Batch</SubmitButton>
                </form>
              </>
            )}

            {['WHOLESALER', 'RETAILER', 'CONSUMER'].includes(user?.role) && (
              <form onSubmit={handleTransfer} className="space-y-3">
                <p className="text-sm font-semibold text-slate-700">Transfer Batch Forward</p>
                <TextField label="Batch ID" type="number" value={batchId} onChange={setBatchId} required />
                <TextField label="Receiving User ID" type="number" value={toUserId} onChange={setToUserId} required />
                <SubmitButton>Transfer Batch</SubmitButton>
              </form>
            )}

            {user?.role === 'RECYCLER' && (
              <>
                {!user?.verified && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    This facility isn't verified yet. An admin must verify it before you can issue certificates.
                  </p>
                )}
                <form onSubmit={handleCloseLoop} className="space-y-3">
                  <p className="text-sm font-semibold text-slate-700">Close Recycling Loop</p>
                  <TextField label="Batch ID" type="number" value={batchId} onChange={setBatchId} required />
                  <TextField label="Weight processed (kg)" type="number" value={weightProcessedKg} onChange={setWeightProcessedKg} required />
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Proof photo (processing floor / weighed material)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={(e) => setProofPhoto(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Hashed in your browser and bound into the certificate — the photo itself never leaves your device.
                    </p>
                  </div>
                  <SubmitButton disabled={!user?.verified || proofSubmitting}>
                    {proofSubmitting ? 'Hashing proof…' : 'Issue Certificate'}
                  </SubmitButton>
                </form>
              </>
            )}
          </div>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-slate-900">Facility Verification</h2>
              <button
                onClick={handleSeedDemoData}
                disabled={seeding}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-semibold disabled:opacity-60"
              >
                {seeding ? 'Seeding…' : 'Seed Demo Data'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Manufacturers and recyclers can't mint or issue certificates until verified here —
              this is the manual gate that keeps unverified "ghost" facilities out of the ledger.
            </p>
            {loadingUsers ? (
              <p className="text-sm text-slate-400">Loading users…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-100">
                      <th className="pb-2 font-medium">ID</th>
                      <th className="pb-2 font-medium">Org</th>
                      <th className="pb-2 font-medium">Role</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u) => (
                      <tr key={u.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 text-slate-500">{u.id}</td>
                        <td className="py-2 text-slate-700">{u.orgName || u.name}</td>
                        <td className="py-2 text-slate-600">{u.role}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {u.verified ? 'Verified' : 'Unverified'}
                          </span>
                        </td>
                        <td className="py-2">
                          {u.verified ? (
                            <button onClick={() => handleUnverifyUser(u.id)} className="text-xs text-red-600 hover:underline">
                              Revoke
                            </button>
                          ) : (
                            <button onClick={() => handleVerifyUser(u.id)} className="text-xs text-brand-600 hover:underline">
                              Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent ? 'text-brand-600' : 'text-slate-900'}`}>{value}</div>
    </div>
  );
}

function TextField({ label, type = 'text', value, onChange, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function SubmitButton({ children, disabled }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition"
    >
      {children}
    </button>
  );
}
