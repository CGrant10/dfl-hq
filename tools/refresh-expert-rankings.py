"""Publish public FantasyPros rank facts with attribution and source freshness.
No analyst notes or premium data are copied. A failed refresh leaves the last
snapshot intact; the client excludes it from valuation after 72 hours.
"""
import json,os,time,math
from pathlib import Path
from urllib.request import Request,urlopen
SOURCE='https://www.fantasypros.com/nfl/rankings/ros-ppr-overall.php'
OUTPUT=Path(os.environ.get('DFL_EXPERT_OUTPUT',str(Path(__file__).resolve().parents[1]/'data/expert-ros-ppr.json')))
def snapshot(html,now):
 marker='var ecrData'
 if marker not in html:raise ValueError('Consensus data missing')
 start=html.index('=',html.index(marker))+1
 data,_=json.JSONDecoder().raw_decode(html[start:].lstrip())
 if data.get('sport')!='NFL' or data.get('ranking_type_name')!='ros' or data.get('scoring')!='PPR' or data.get('position_id')!='ALL':raise ValueError('Wrong rankings format')
 updated=int(data.get('last_updated_ts',0))*1000
 if updated<=0 or updated>now+300000 or now-updated>72*60*60*1000:raise ValueError('Source rankings are not fresh')
 experts=int(data.get('total_experts',0))
 if experts<2:raise ValueError('Consensus needs at least two experts')
 players=[]
 for p in data.get('players',[]):
  position=p.get('player_position_id')
  if position not in ['QB','RB','WR','TE']:continue
  positional=p.get('pos_rank','')
  if not positional.startswith(position):continue
  try:
   row={'sourceId':int(p['player_id']),'name':p['player_name'],'position':position,'team':p.get('player_team_id') or 'FA','rank':int(p['rank_ecr']),'positionRank':int(positional[len(position):]),'minRank':int(p['rank_min']),'maxRank':int(p['rank_max']),'stdDev':float(p['rank_std'])}
  except (KeyError,ValueError,TypeError):continue
  if min(row['rank'],row['positionRank'],row['minRank'])<=0 or row['minRank']>row['maxRank'] or not math.isfinite(row['stdDev']) or row['stdDev']<0:continue
  players.append(row)
 if len(players)<100:raise ValueError('Incomplete ranking response')
 return {'schemaVersion':1,'source':'FantasyPros','sourceUrl':SOURCE,'kind':'rest-of-season','scoring':'ppr','season':int(data['year']),'experts':experts,'updatedAt':updated,'fetchedAt':now,'players':players}
if __name__=='__main__':
 with urlopen(Request(SOURCE,headers={'User-Agent':'DFL-HQ public rankings refresh (github.com/CGrant10/dfl-hq)'}),timeout=30) as response:html=response.read().decode('utf-8')
 result=snapshot(html,int(time.time()*1000))
 OUTPUT.parent.mkdir(parents=True,exist_ok=True)
 temporary=OUTPUT.with_suffix('.tmp');temporary.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');temporary.replace(OUTPUT)
 print(json.dumps({'source':result['source'],'season':result['season'],'players':len(result['players']),'experts':result['experts'],'updatedAt':result['updatedAt']}))
