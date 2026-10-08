import { useState } from "react";
import type { Catalog, ScheduledSet } from "../data/model";
import { saveSchedule } from "../data/actions";
import { shortId } from "../data/ids";
import { localTimeOptions, toLocalInput } from "../data/time";
import { Message } from "../components/ui";
import { errorMessage } from "../components/errors";

function TimeField({ label, value = "", zone, onChange }: { label: string; value?: string; zone: string; onChange(value: string): void }) {
  const local = /(Z|[+-]\d{2}:\d{2})$/.test(value) ? toLocalInput(value, zone) : value;
  const options = local && zone ? localTimeOptions(local, zone) : [];
  return <label className="rs-field">{label}
    <input type="datetime-local" value={local} disabled={!zone} onChange={event => {
      const choices = zone && event.target.value ? localTimeOptions(event.target.value, zone) : [];
      onChange(choices.length === 1 ? choices[0].iso : event.target.value);
    }} />
    {options.length > 1 && <select aria-label={`${label} occurrence`} value={value} onChange={event => onChange(event.target.value)}>
      <option value={local}>Choose occurrence</option>
      {options.map(option => <option key={option.iso} value={option.iso}>{option.label}</option>)}
    </select>}
  </label>;
}

export function ScheduleEditor({ catalog, concertId }: { catalog: Catalog; concertId: string }) {
  const concert = catalog.concerts.find(item => item.id === concertId)!;
  const saved = catalog.schedules.find(item => item.id === concertId)?.sets || [];
  const [draft, setDraft] = useState<ScheduledSet[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sets = draft ?? saved;
  const zone = catalog.venues.find(item => item.id === concert.venue_id)?.timezone || "";
  const lineup = [...new Set([concert.artist_id, ...concert.supporting_artist_ids].filter(Boolean))];
  const change = (id: string, fields: Partial<ScheduledSet>) => setDraft(sets.map(set => set.id === id ? { ...set, ...fields } : set));
  return <details className="rs-schedule-editor"><summary>Schedule</summary>
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      try {
        await saveSchedule(concertId, sets.map(set => Object.fromEntries(Object.entries(set).filter(([, value]) => value !== "" && value !== undefined)) as unknown as ScheduledSet));
        setDraft(null);
      } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
    }}>
      <fieldset disabled={busy}>
        {sets.map(set => <div className="rs-schedule-edit-row" key={set.id}>
          <label className="rs-field">Artist<select required value={set.artist_id} onChange={event => change(set.id, { artist_id: event.target.value })}>
            <option value="">Select artist</option>
            {lineup.map(id => <option value={id} key={id}>{catalog.artists.find(artist => artist.id === id)?.name || id}</option>)}
          </select></label>
          <label className="rs-field">Day<input type="date" value={set.day || ""} onChange={event => change(set.id, { day: event.target.value })} /></label>
          <TimeField label="Start" value={set.start} zone={zone} onChange={start => change(set.id, { start })} />
          <TimeField label="End" value={set.end} zone={zone} onChange={end => change(set.id, { end })} />
          <label className="rs-field">Stage<input value={set.stage || ""} maxLength={200} onChange={event => change(set.id, { stage: event.target.value })} /></label>
          <button className="rs-text-button" type="button" onClick={() => setDraft(sets.filter(item => item.id !== set.id))}>Remove set</button>
        </div>)}
        <div className="rs-form-actions">
          <button className="rs-secondary" type="button" onClick={() => setDraft([...sets, { id: shortId(), artist_id: "" }])}>Add set</button>
          <button className="rs-primary" type="submit" disabled={!draft}>{busy ? "Saving…" : "Save schedule"}</button>
        </div>
      </fieldset>
      {error && <Message error>{error}</Message>}
    </form>
  </details>;
}
