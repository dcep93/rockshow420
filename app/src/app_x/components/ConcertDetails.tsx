import type { Catalog, Concert } from "../data/model";
import { useLogEditor } from "../forms/useLogEditor";
import { LogEditor } from "../forms/LogEditor";
import { ConcertEntries } from "./ConcertEntries";
import { ConcertLineup } from "./ConcertLineup";
import { Message } from "./ui";

export function ConcertDetails({ catalog, concert, viewerUid, isAdmin }: {
  catalog: Catalog; concert: Concert; viewerUid?: string; isAdmin: boolean;
}) {
  const log = catalog.logs.find(item => item.concert_id === concert.id && item.user_id === viewerUid);
  const editor = useLogEditor(concert.id, viewerUid, log);
  return <>
    {editor.error && <Message error>{editor.error}</Message>}
    <div className="rs-detail-grid">
      <ConcertLineup catalog={catalog} concert={concert} editor={viewerUid ? editor : undefined} />
      <div className="rs-concert-logs">
        {viewerUid && <LogEditor editor={editor} />}
        <ConcertEntries catalog={catalog} concert={concert} viewerUid={viewerUid} isAdmin={isAdmin} />
      </div>
    </div>
  </>;
}
