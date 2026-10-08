"""Conservative one-to-one matching of public performances to scheduled sets."""
from datetime import datetime
from zoneinfo import ZoneInfo


def match_performances(sets, pages, timezone='UTC'):
    """Pages must already pass artist identity and exact festival membership.

    Include empty pages in this matching step: a missing song list is not a
    reason to assign a different performance to the slot.
    """
    choices = {}
    for page in pages:
        matching = []
        for item in sets:
            days = {item['day']} if item.get('day') else set()
            if item.get('start'):
                days.add(datetime.fromisoformat(item['start'].replace('Z', '+00:00')).astimezone(ZoneInfo(timezone)).date().isoformat())
            if page['event_date'] in days:
                matching.append(item['set_id'])
        choices[page['url']] = matching
    accepted = {}
    for url, ids in choices.items():
        if len(ids) == 1 and sum(ids[0] in candidates for candidates in choices.values()) == 1:
            accepted[url] = ids[0]
    return accepted
