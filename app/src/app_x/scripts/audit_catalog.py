"""Read-only schema/reference audit; never treats saved snapshots as live data."""
import argparse
from collections import Counter
from pathlib import Path
from seed_setlists import catalog
from refresh_setlists import read, save

FIELDS = {
    'artists': {'name','image'},
    'venues': {'name','timezone','location','image'},
    'concerts': {'name','date','date_precision','end_date','venue_id','artist_id','supporting_artist_ids','setlist_fm_url'},
    'schedules': {'sets'},
    'festivals': {'name','concert_ids'},
    'users': {'user_id','username'},
    'user_concerts': {'user_id','concert_id','supporting_artist_ids','removed','notes','ticket_status','seen_set_ids'},
}


def audit(data):
    report = {'counts':{k:len(v) for k,v in data.items()}, 'unknown_fields': [], 'broken_references': [], 'default_only_logs': [], 'cancelled_to_migrate': [], 'missing_venues': [], 'date_only': [], 'no_artist_ids': [], 'duplicate_events': []}
    for table, records in data.items():
        if table not in FIELDS: continue
        for id, row in records.items():
            extra = sorted(set(row)-FIELDS[table])
            if extra: report['unknown_fields'].append({'table':table,'id':id,'fields':extra})
    def ref(table, id, source):
        if id and id not in data[table]: report['broken_references'].append({'source':source,'table':table,'id':id})
    identities={}
    for id, c in data['concerts'].items():
        ref('venues',c.get('venue_id'),f'concerts/{id}')
        for artist in [c.get('artist_id'),*c.get('supporting_artist_ids',[])]:ref('artists',artist,f'concerts/{id}')
        if not c.get('venue_id'):report['missing_venues'].append(id)
        if c.get('date_precision')=='day':report['date_only'].append(id)
        if not c.get('artist_id') and not c.get('supporting_artist_ids'):report['no_artist_ids'].append(id)
        if c.get('status')=='cancelled':report['cancelled_to_migrate'].append(id)
        identity=(c.get('date'),c.get('artist_id'),c.get('name'),c.get('venue_id'))
        if identity in identities:report['duplicate_events'].append([identities[identity],id])
        identities[identity]=id
    for id,f in data.get('festivals',{}).items():
        for cid in f.get('concert_ids',[]):ref('concerts',cid,f'festivals/{id}')
    for cid,s in data.get('schedules',{}).items():
        ref('concerts',cid,f'schedules/{cid}')
        for sid,item in s.get('sets',{}).items():ref('artists',item.get('artist_id'),f'schedules/{cid}/{sid}')
    users={p['user_id'] for p in data['users'].values()}
    for id,l in data['user_concerts'].items():
        ref('concerts',l.get('concert_id'),f'user_concerts/{id}')
        for aid in l.get('supporting_artist_ids',[]):ref('artists',aid,f'user_concerts/{id}')
        for sid in l.get('seen_set_ids',[]):
            if sid not in data.get('schedules',{}).get(l.get('concert_id'),{}).get('sets',{}):report['broken_references'].append({'source':f'user_concerts/{id}','table':'schedules','id':sid})
        if l.get('user_id') not in users: report['broken_references'].append({'source':f'user_concerts/{id}','table':'users','id':l.get('user_id')})
        if not any([l.get('removed'),l.get('notes','').strip(),l.get('supporting_artist_ids'),l.get('ticket_status'),l.get('seen_set_ids')]):report['default_only_logs'].append(id)
    report['unknown_field_counts']=dict(Counter(f'{x["table"]}.{k}' for x in report['unknown_fields'] for k in x['fields']))
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalog',type=Path)
    parser.add_argument('--snapshot-root',type=Path)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if bool(args.catalog)==bool(args.snapshot_root):parser.error('Choose one catalog source')
    result=audit(read(args.catalog,{}) if args.catalog else catalog(args.snapshot_root))
    result['source']='saved_snapshot' if args.snapshot_root else str(args.catalog)
    save(args.output,result)
    print({k:len(v) if isinstance(v,list) else v for k,v in result.items() if k!='unknown_fields'})
