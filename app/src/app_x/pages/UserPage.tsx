import { useApp } from "../data/store";
import { userConcertRows } from "../data/model";
import type { Concert, UserConcert } from "../data/model";
import { MissingConcert } from "../components/MissingConcert";
import { ConcertRow } from "../components/ConcertRow";
import { Empty } from "../components/ui";

export function UserPage({
  username,
  onRestore,
  onEdit,
}: {
  username: string;
  onRestore: (uid: string) => void;
  onEdit: (concert: Concert, log: UserConcert | undefined, uid: string) => void;
}) {
  const { catalog, viewer, isAdmin, loading } = useApp();
  const profile = catalog.profiles.find((item) => item.username === username || item.id === username);
  if (loading) return null;
  if (!profile) return <Empty title="User not found" />;
  const canEdit = isAdmin || viewer?.uid === profile.user_id;
  const rows = userConcertRows(catalog, profile.user_id);
  const hasRemoved = catalog.logs.some((log) => log.user_id === profile.user_id && log.removed
    && catalog.concerts.some((concert) => concert.id === log.concert_id));
  return (
    <>
      <section className="rs-page-heading">
        <div>
          <h1>@{username}</h1>
          <p className="rs-count">
            {rows.length} {rows.length === 1 ? "concert" : "concerts"}
          </p>
        </div>
        {canEdit && hasRemoved && (
          <button type="button" className="rs-text-button" onClick={() => onRestore(profile.user_id)}>
            Removed concerts
          </button>
        )}
      </section>
      <section className="rs-concert-list" aria-label={`${username}’s concerts`}>
        {rows.map(({ log, concert }) =>
          concert ? (
            <ConcertRow
              key={concert.id}
              catalog={catalog}
              concert={concert}
              log={log ?? null}
              onEdit={canEdit ? () => onEdit(concert, log, profile.user_id) : undefined}
            />
          ) : log ? (
            <MissingConcert key={log.id} log={log ?? null} canEdit={canEdit} />
          ) : null,
        )}
        {!rows.length && <Empty title="No concerts" />}
      </section>
    </>
  );
}
