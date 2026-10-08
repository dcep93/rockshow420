import { useRef, useState } from "react";
import type { Catalog, EntityKind } from "../data/model";
import { deleteEntity, saveEntity } from "../data/actions";
import { isCalendarDate, isTimezone, localTimeOptions, toLocalInput } from "../data/time";
import { Modal, Message } from "../components/ui";
import { errorMessage } from "../components/errors";
import { concertName } from "../data/presentation";

export function EntityEditor({
  kind,
  id,
  catalog,
  onClose,
  onSaved,
  inline = false,
}: {
  inline?: boolean;
  kind: EntityKind;
  id?: string;
  catalog: Catalog;
  onClose: () => void;
  onSaved: (id: string) => Promise<void> | void;
}) {
  const item =
    kind === "venue"
      ? catalog.venues.find((value) => value.id === id)
      : kind === "artist"
        ? catalog.artists.find((value) => value.id === id)
        : kind === "festival"
          ? catalog.festivals.find((value) => value.id === id)
          : catalog.concerts.find((value) => value.id === id);
  const venue = catalog.venues.find(
    (value) => value.id === (item && "venue_id" in item ? item.venue_id : ""),
  );
  const [name, setName] = useState(item && "name" in item ? item.name || "" : "");
  const [image, setImage] = useState(item && "image" in item ? item.image : "");
  const [location, setLocation] = useState(catalog.venues.find((value) => value.id === id)?.location || "");
  const [timezone, setTimezone] = useState(
    catalog.venues.find((value) => value.id === id)?.timezone || "America/New_York",
  );
  const [venueId, setVenueId] = useState(venue?.id || "");
  const [artistId, setArtistId] = useState(item && "artist_id" in item ? item.artist_id : "");
  const [support, setSupport] = useState(
    item && "supporting_artist_ids" in item ? item.supporting_artist_ids : [],
  );
  const [concertIds, setConcertIds] = useState(item && "concert_ids" in item ? item.concert_ids : []);
  const [setlist, setSetlist] = useState(item && "setlist_fm_url" in item ? item.setlist_fm_url : "");
  const [dateOnly, setDateOnly] = useState(item && "date_precision" in item && item.date_precision === "day");
  const [endDate, setEndDate] = useState(item && "end_date" in item ? item.end_date || "" : "");
  const [localDate, setLocalDate] = useState(
    item && "date" in item ? (item.date_precision === "day" ? item.date.slice(0, 10) : toLocalInput(item.date, venue?.timezone || "UTC")) : "",
  );
  const zone = catalog.venues.find((value) => value.id === venueId)?.timezone || "";
  const [offsetChoice, setOffsetChoice] = useState(
    item && "date" in item && item.date
      ? new Date(Math.floor(new Date(item.date).getTime() / 60000) * 60000).toISOString()
      : "",
  );
  const [dateEdited, setDateEdited] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [filter, setFilter] = useState("");
  const options = localDate && isTimezone(zone) ? localTimeOptions(localDate, zone) : [];
  const dateOption =
    options.length === 1 ? options[0] : options.find((option) => option.iso === offsetChoice);
  const title = `${id ? "Edit" : "New"} ${kind}`;
  const savedIdRef = useRef(id || null);
  function toggle(values: string[], value: string) {
    return values.includes(value) ? values.filter((current) => current !== value) : [...values, value];
  }
  async function submit() {
    setError("");
    let fields: Record<string, unknown>;
    if (kind === "concert") {
      if (dateOnly ? !isCalendarDate(localDate) : !dateOption) {
        setError(
          options.length > 1
            ? "Choose which occurrence of this local time you mean."
            : "Enter a valid date and time in the venue’s timezone. This time may fall in a daylight-saving gap.",
        );
        return;
      }
      if (
        (artistId ? !catalog.artists.some((value) => value.id === artistId) : !name.trim()) ||
        (venueId ? !catalog.venues.some((value) => value.id === venueId) : !dateOnly)
      ) {
        setError("Enter a name or select a headliner. A venue is required when a time is known.");
        return;
      }
      if (
        support.some((value) => value === artistId || !catalog.artists.some((artist) => artist.id === value))
      ) {
        setError("Supporting acts must be existing artists other than the headliner.");
        return;
      }
      if (setlist && !/^https:\/\/(www\.)?setlist\.fm\//i.test(setlist.trim())) {
        setError("Use an HTTPS link to a setlist.fm page.");
        return;
      }
      fields = {
        name: name.trim(),
        date_precision: dateOnly ? "day" : "time",
        end_date: dateOnly ? endDate : "",
        ...(dateEdited || !id ? { date: dateOnly ? `${localDate}T00:00:00.000Z` : dateOption!.iso } : {}),
        venue_id: venueId,
        artist_id: artistId,
        supporting_artist_ids: support,
        setlist_fm_url: setlist.trim(),
      };
    } else {
      if (!name.trim()) {
        setError("A name is required.");
        return;
      }
      if ((kind === "venue" || kind === "artist") && image && !/^https:\/\//i.test(image.trim())) {
        setError("Use an HTTPS image URL.");
        return;
      }
      fields = { name: name.trim() };
      if (kind === "venue") {
        if (!isTimezone(timezone)) {
          setError("Enter a valid IANA timezone, such as America/New_York.");
          return;
        }
        Object.assign(fields, { location: location.trim(), timezone, image: image.trim() });
      }
      if (kind === "artist") fields.image = image.trim();
      if (kind === "festival") {
        if (concertIds.some((value) => !catalog.concerts.some((concert) => concert.id === value))) {
          setError("Remove unavailable concerts from this festival before saving.");
          return;
        }
        fields.concert_ids = concertIds;
      }
    }
    setBusy(true);
    try {
      const savedId = await saveEntity(kind, savedIdRef.current, fields);
      savedIdRef.current = savedId;
      await onSaved(savedId);
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }
  async function remove() {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      await deleteEntity(kind, id, catalog);
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }
  const Frame = inline ? InlineFrame : Modal;
  return (
    <Frame
      title={title}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {(
          <label className="rs-field">
            Name {kind === "concert" && <span className="rs-optional">optional with a headliner</span>}
            <input
              required={kind !== "concert" || !artistId}
              value={name}
              maxLength={200}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </label>
        )}
        {kind === "venue" && (
          <>
            <label className="rs-field">
              Location
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="City, state or country"
                maxLength={300}
              />
            </label>
            <label className="rs-field">
              Timezone
              <input
                required
                list="rs-timezones"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder="America/New_York"
              />
            </label>
            <datalist id="rs-timezones">
              {Intl.supportedValuesOf("timeZone").map((value) => (
                <option value={value} key={value} />
              ))}
            </datalist>
          </>
        )}
        {(kind === "venue" || kind === "artist") && (
          <label className="rs-field">
            Image URL <span className="rs-optional">optional</span>
            <input
              type="url"
              value={image}
              onChange={(event) => setImage(event.target.value)}
              placeholder="https://…"
            />
          </label>
        )}
        {kind === "concert" && (
          <>
            <label className="rs-field">
              Headliner
              <select
                value={artistId}
                onChange={(event) => {
                  setArtistId(event.target.value);
                  setSupport(support.filter((value) => value !== event.target.value));
                }}
              >
                <option value="">Select artist</option>
                {catalog.artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="rs-field">
              Venue
              <select
                required={!dateOnly}
                value={venueId}
                onChange={(event) => {
                  const nextZone = catalog.venues.find((value) => value.id === event.target.value)?.timezone;
                  if (!dateOnly && dateOption && nextZone) setLocalDate(toLocalInput(dateOption.iso, nextZone));
                  setVenueId(event.target.value);
                  setOffsetChoice("");
                }}
              >
                <option value="">Select venue</option>
                {catalog.venues.map((value) => (
                  <option key={value.id} value={value.id}>
                    {value.name}
                  </option>
                ))}
              </select>
            </label>
            {(!catalog.artists.length || !catalog.venues.length) && (
              <Message>Create missing artists or venues in Manage.</Message>
            )}
            <label className="rs-check">
              <input type="checkbox" checked={dateOnly} onChange={(event) => {
                setDateOnly(event.target.checked);
                setLocalDate(localDate.slice(0, 10) + (event.target.checked || !localDate ? "" : "T"));
                setDateEdited(true);
                setOffsetChoice("");
              }} />
              Time unknown
            </label>
            <label className="rs-field">
              {dateOnly ? "Date" : "Date and time"}
              <input
                required
                type={dateOnly ? "date" : "datetime-local"}
                value={localDate}
                onChange={(event) => {
                  setLocalDate(event.target.value);
                  setOffsetChoice("");
                  setDateEdited(true);
                }}
              />
            </label>
            {dateOnly && <label className="rs-field">End date <span className="rs-optional">optional</span><input type="date" min={localDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>}
            {!dateOnly && <p className="rs-help">
              {zone
                ? `Local time in ${zone.replaceAll("_", " ")}`
                : "Select a venue to determine the timezone."}
            </p>}
            {options.length > 1 && (
              <label className="rs-field">
                This time occurs twice
                <select
                  required
                  value={dateOption?.iso || ""}
                  onChange={(event) => {
                    setOffsetChoice(event.target.value);
                    setDateEdited(true);
                  }}
                >
                  <option value="">Choose an occurrence</option>
                  {options.map((option) => (
                    <option key={option.iso} value={option.iso}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <fieldset>
              <legend>Supporting artists</legend>
              <div className="rs-check-list">
                {support
                  .filter((value) => !catalog.artists.some((artist) => artist.id === value))
                  .map((value) => (
                    <label className="rs-check" key={value}>
                      <input
                        type="checkbox"
                        checked
                        onChange={() => setSupport(support.filter((current) => current !== value))}
                      />
                      Unavailable artist ({value}) — uncheck to remove
                    </label>
                  ))}
                {catalog.artists
                  .filter((artist) => artist.id !== artistId)
                  .map((artist) => (
                    <label className="rs-check" key={artist.id}>
                      <input
                        type="checkbox"
                        checked={support.includes(artist.id)}
                        onChange={() => setSupport(toggle(support, artist.id))}
                      />
                      {artist.name}
                    </label>
                  ))}
                {catalog.artists.length <= 1 && (
                  <p className="rs-help">No other artists</p>
                )}
              </div>
            </fieldset>
            <label className="rs-field">
              Setlist.fm URL <span className="rs-optional">optional</span>
              <input
                type="url"
                value={setlist}
                onChange={(event) => setSetlist(event.target.value)}
                placeholder="https://www.setlist.fm/setlist/…"
              />
            </label>
          </>
        )}
        {kind === "festival" && (
          <fieldset>
            <legend>Concerts</legend>
            <input
              type="search"
              aria-label="Search festival concerts"
              placeholder="Find a concert"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            <div className="rs-check-list">
              {concertIds
                .filter((value) => !catalog.concerts.some((concert) => concert.id === value))
                .map((value) => (
                  <label className="rs-check" key={value}>
                    <input
                      type="checkbox"
                      checked
                      onChange={() => setConcertIds(concertIds.filter((current) => current !== value))}
                    />
                    Unavailable concert ({value}) — uncheck to remove
                  </label>
                ))}
              {catalog.concerts
                .filter((concert) =>
                  concertName(concert, catalog).toLowerCase().includes(filter.toLowerCase()),
                )
                .map((concert) => (
                  <label className="rs-check" key={concert.id}>
                    <input
                      type="checkbox"
                      checked={concertIds.includes(concert.id)}
                      onChange={() => setConcertIds(toggle(concertIds, concert.id))}
                    />
                    {concertName(concert, catalog)}
                  </label>
                ))}
            </div>
          </fieldset>
        )}
        {error && <Message error>{error}</Message>}
        {confirmRemove && (
          <div className="rs-confirm">
            <p>Delete this {kind}?</p>
            <button type="button" disabled={busy} className="rs-danger" onClick={() => void remove()}>
              Delete {kind}
            </button>
            <button
              type="button"
              className="rs-text-button"
              disabled={busy}
              onClick={() => setConfirmRemove(false)}
            >
              Cancel
            </button>
          </div>
        )}
        {!confirmRemove && (
          <div className="rs-form-actions">
            {id && (
              <button
                type="button"
                className="rs-text-button rs-danger-text"
                disabled={busy}
                onClick={() => setConfirmRemove(true)}
              >
                Delete
              </button>
            )}
            <span className="rs-spacer" />
            <button type="button" className="rs-secondary" disabled={busy} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="rs-primary" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </form>
    </Frame>
  );
}

function InlineFrame({ title, children }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <section className="rs-panel rs-inline-editor" aria-label={title}><h2>{title}</h2>{children}</section>;
}
