"""Publish small, current Sleeper RB depth-chart facts; no fantasy-league writes."""
import json,time,urllib.request
from pathlib import Path

def snapshot(players,now):
    rows={str(id):{'team':p['team'],'order':p['depth_chart_order']} for id,p in players.items()
          if str(id).isdigit() and p.get('position')=='RB' and p.get('depth_chart_position')=='RB'
          and isinstance(p.get('team'),str) and p['team'].isalpha() and 2<=len(p['team'])<=3
          and type(p.get('depth_chart_order')) is int and 1<=p['depth_chart_order']<=15}
    if len(rows)<32 or len(rows)>500 or len({p['team'] for p in rows.values()})<24:
        raise ValueError('Incomplete NFL backfield source; retaining last snapshot')
    return {'schemaVersion':1,'source':'Sleeper','fetchedAt':now,'players':dict(sorted(rows.items()))}

if __name__=='__main__':
    with urllib.request.urlopen('https://api.sleeper.app/v1/players/nfl',timeout=25) as response:
        data=snapshot(json.load(response),int(time.time()*1000))
    target=Path(__file__).resolve().parents[1]/'data/backfield-roles.json'
    target.write_text(json.dumps(data,separators=(',',':'))+'\n')
    print('Published',len(data['players']),'Sleeper RB roles')
