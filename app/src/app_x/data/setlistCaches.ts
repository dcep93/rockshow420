import setlists from "./cached.setlist.fm.json";
import musicals from "./cached.musicals.json";
import type { SetlistCaches } from "./concertSearch";

// Part of the initial application bundle: search never triggers a lazy fetch.
export const setlistCaches = { setlists, musicals } as SetlistCaches;
