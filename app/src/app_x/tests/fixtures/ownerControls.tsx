// Start: npx vite --config src/app_x/tests/fixtures/ownerControls.config.mjs
// Open: http://127.0.0.1:5176/src/app_x/tests/fixtures/ownerControls.html
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ConcertDetails } from '../../components/ConcertDetails';
import { emptyCatalog, normalizeConcert, normalizeLog, normalizeArtist } from '../../data/model';
import type { Catalog } from '../../data/model';
import type { LogPatch } from '../../data/tableActions';
import { isDefaultLog } from '../../data/logChanges';
import '../../styles/theme.css';
import '../../styles/layout.css';
import '../../styles/forms.css';

const concert = normalizeConcert('fixture', { artist_id: 'head', supporting_artist_ids: ['support'] });
const seed: Catalog = { ...emptyCatalog,
  concerts: [concert],
  artists: [normalizeArtist('head', { name: 'Headliner' }), normalizeArtist('support', { name: 'Supporting Artist' })],
  profiles: [{ id: 'dcep93', username: 'dcep93', user_id: 'owner' }, { id: 'visitor', username: 'visitor', user_id: 'viewer' }, { id: 'empty', username: 'empty', user_id: 'empty' }],
  logs: [normalizeLog('owner_fixture', { user_id: 'owner', concert_id: 'fixture', ticket_status: 'purchased', supporting_artist_ids: ['support'], seen_set_ids: ['early'], notes: 'Owner public notes' }), normalizeLog('viewer_fixture', { user_id: 'viewer', concert_id: 'fixture', ticket_status: 'sold_out' })],
};
export function Fixture() {
  const [viewer, setViewer] = useState('viewer');
  const [festival, setFestival] = useState(false);
  const [data, setData] = useState(seed);
  const [writes, setWrites] = useState(0);
  useEffect(() => {
    const save = (event: Event) => {
      const { uid, concertId, patch } = (event as CustomEvent<{ uid: string; concertId: string; patch: LogPatch }>).detail;
      setWrites(count => count + 1);
      setData(previous => {
        const id = `${uid}_${concertId}`;
        const log = normalizeLog(id, { ...previous.logs.find(item => item.id === id), ...patch, user_id: uid, concert_id: concertId });
        const { id: _id, ...fields } = log;
        return { ...previous, logs: [...previous.logs.filter(item => item.id !== id), ...(isDefaultLog(fields) ? [] : [log])] };
      });
    };
    window.addEventListener('fixture-save', save);
    return () => window.removeEventListener('fixture-save', save);
  }, []);
  const catalog = { ...data, schedules: festival ? [{ id: 'fixture', sets: [
    { id: 'early', artist_id: 'head', day: '2026-10-09', start: '2026-10-09T18:00:00Z' },
    { id: 'late', artist_id: 'support', day: '2026-10-09', start: '2026-10-09T20:00:00Z' },
  ] }] : [] };
  return <div className="rs-shell"><main className="rs-main">
    <nav aria-label="Fixture controls">
      <select aria-label="Fixture account" value={viewer} onChange={event => setViewer(event.target.value)}>
        <option value="">Guest</option><option value="owner">dcep93</option><option value="viewer">Visitor</option><option value="empty">No saved log</option>
      </select>
      <label><input type="checkbox" checked={festival} onChange={event => setFestival(event.target.checked)} />Festival fixture</label>
      <details><summary>Fixture state</summary><output aria-label="Fixture saved records">{JSON.stringify({ writes, logs: data.logs })}</output></details>
    </nav>
    <ConcertDetails key={`${viewer}:${festival}`} catalog={catalog} concert={concert} viewerUid={viewer || undefined} isAdmin={viewer === 'owner'} />
  </main></div>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
