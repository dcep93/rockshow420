type FeedView = { scrollY: number; query: string; showHidden: boolean; searchSetlists: boolean };
const defaults: FeedView = { scrollY: 0, query: "", showHidden: false, searchSetlists: false };
const views = new Map<string, FeedView>();

export function readFeedView(username: string): FeedView {
  return { ...(views.get(username) || defaults) };
}

export function updateFeedView(username: string, changes: Partial<FeedView>): void {
  views.set(username, { ...readFeedView(username), ...changes });
}
