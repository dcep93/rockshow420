import { useApp } from "../data/store";
import type { Concert, UserConcert } from "../data/model";
import { MissingConcert } from "../components/MissingConcert";
import { ConcertRow } from "../components/ConcertRow";
import { Empty } from "../components/ui";

export function UserPage({
  username,
  onAdd,
  onEdit,
}: {
  username: string;
  onAdd: (uid: string) => void;
  onEdit: (concert: Concert, log: UserConcert) => void;
}) {
  const { catalog, viewer, isAdmin, loading } = useApp();
  const profile = catalog.profiles.find((item) => item.username === username || item.id === username);
  if (loading) return null;
  if (!profile) return <Empty title="User not found" />;
  const canEdit = isAdmin || viewer?.uid === profile.user_id;
  const rows = catalog.logs
    .filter((log) => log.user_id === profile.user_id)
    .map((log) => ({ log, concert: catalog.concerts.find((concert) => concert.id === log.concert_id) }))
    .sort((a, b) => (b.concert?.date || "").localeCompare(a.concert?.date || ""));
  return (
    <>
      <section className="rs-page-heading">
        <div>
          <h1>@{username}</h1>
          <p className="rs-count">
            {rows.length} {rows.length === 1 ? "concert" : "concerts"}
          </p>
        </div>
        {canEdit && (
          <button type="button" className="rs-primary" onClick={() => onAdd(profile.user_id)}>
            Add concert
          </button>
        )}
      </section>
      <section className="rs-concert-list" aria-label={`${username}’s concerts`}>
        {rows.map(({ log, concert }) =>
          concert ? (
            <ConcertRow
              key={log.id}
              catalog={catalog}
              concert={concert}
              log={log}
              onEdit={canEdit ? () => onEdit(concert, log) : undefined}
            />
          ) : (
            <MissingConcert key={log.id} log={log} canEdit={canEdit} />
          ),
        )}
        {!rows.length && <Empty title="No concerts" />}
      </section>
    </>
  );
}
