import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBatchHistory, verifyBatch } from '../services/batchService';

function shortHash(hash) {
  if (!hash || hash === 'GENESIS') return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export default function BatchDetail() {
  const { id } = useParams();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getBatchHistory(id);
        if (!cancelled) setHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  async function handleVerify() {
    setVerifying(true);
    try {
      const result = await verifyBatch(id);
      setVerifyResult(result.chainIntact);
    } catch (err) {
      setVerifyResult(false);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="text-sm text-brand-600 hover:underline">← Dashboard</Link>
        <h1 className="font-bold text-slate-900">Batch #{id} — Hash Chain History</h1>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Each step below is a real record in the database. Every hash is computed from the
            previous one — changing any past record would break every hash after it.
          </p>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="shrink-0 ml-4 text-sm px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold disabled:opacity-60"
          >
            {verifying ? 'Checking…' : 'Verify Chain Integrity'}
          </button>
        </div>

        {verifyResult !== null && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
              verifyResult ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {verifyResult ? '✅ Chain intact — no tampering detected.' : '⚠️ Chain broken — this batch may have been tampered with.'}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading history…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-400">No transfer history for this batch.</p>
        ) : (
          <ol className="relative border-l-2 border-brand-200 ml-3">
            {history.map((t, idx) => (
              <li key={t.id} className="mb-8 ml-6">
                <span className="absolute -left-[9px] w-4 h-4 rounded-full bg-brand-500 border-4 border-white" />
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {t.fromRole === 'GENESIS' ? 'Minted' : `${t.fromRole} → ${t.toRole}`}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(t.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    {t.fromUserName} {t.fromRole !== 'GENESIS' && '→'} {t.fromRole === 'GENESIS' ? '' : t.toUserName}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-slate-50 rounded-lg px-2 py-1.5">
                      <span className="text-slate-400">prev: </span>
                      <span className="text-slate-700">{shortHash(t.prevHash)}</span>
                    </div>
                    <div className="bg-brand-50 rounded-lg px-2 py-1.5">
                      <span className="text-slate-400">hash: </span>
                      <span className="text-brand-700">{shortHash(t.currentHash)}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
