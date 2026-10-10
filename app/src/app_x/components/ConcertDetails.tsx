import { concertOwner } from "../data/concertLogs";
import type { Catalog, Concert } from "../data/model";
import { useLogEditor } from "../forms/useLogEditor";
import { LogEditor } from "../forms/LogEditor";
import { ConcertEntries } from "./ConcertEntries";
import { ConcertLineup } from "./ConcertLineup";
import { Message } from "./ui";

export function ConcertDetails({ catalog, concert, viewerUid, isAdmin }: {
  catalog: Catalog; concert: Concert; viewerUid?: string; isAdmin: boolean;
}) {
  const ownerUid = concertOwner(catalog)?.user_id;
  const log = catalog.logs.find(item => item.concert_id === concert.id && item.user_id === ownerUid);
  const editor = useLogEditor(concert.id, ownerUid === viewerUid ? viewerUid : undefined, log);
  return <>
    {editor.error && <Message error>{editor.error}</Message>}
    <div className="rs-detail-grid">
      <ConcertLineup catalog={catalog} concert={concert} editor={editor} />
      <div className="rs-concert-logs">
        <LogEditor editor={editor} />
        <ConcertEntries catalog={catalog} concert={concert} viewerUid={viewerUid} isAdmin={isAdmin} />
      </div>
    </div>
  </>;
}
