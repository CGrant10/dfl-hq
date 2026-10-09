import importlib.util,json,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('refresh',Path(__file__).with_name('refresh-expert-rankings.py'))
refresh=importlib.util.module_from_spec(spec);spec.loader.exec_module(refresh)
NOW=1791504000000
class RankingsRefresh(unittest.TestCase):
 def source(self,**changes):
  data={'sport':'NFL','ranking_type_name':'ros','scoring':'PPR','position_id':'ALL','year':'2026','last_updated_ts':NOW//1000-3600,'total_experts':8,'players':[{'player_id':i+1,'player_name':f'Player {i}','player_position_id':'WR','player_team_id':'DET','pos_rank':f'WR{i+1}','rank_ecr':i+1,'rank_min':str(i+1),'rank_max':str(i+2),'rank_std':'0.5','note':'Premium text; must not be copied'} for i in range(110)]}
  data.update(changes);return '<script>var ecrData = '+json.dumps(data)+';</script>'
 def test_public_facts_and_source_date_only(self):
  result=refresh.snapshot(self.source(),NOW)
  self.assertEqual(result['experts'],8);self.assertEqual(len(result['players']),110);self.assertEqual(result['updatedAt'],NOW-3600000)
  self.assertNotIn('note',result['players'][0]);self.assertNotIn('Premium text',json.dumps(result))
 def test_wrong_format_is_rejected(self):
  for change in [{'scoring':'HALF'},{'ranking_type_name':'weekly'},{'position_id':'QB'},{'sport':'NBA'}]:
   with self.assertRaises(ValueError):refresh.snapshot(self.source(**change),NOW)
 def test_stale_or_future_source_is_rejected(self):
  for timestamp in [NOW//1000-73*3600,NOW//1000+600]:
   with self.assertRaises(ValueError):refresh.snapshot(self.source(last_updated_ts=timestamp),NOW)
 def test_partial_or_single_expert_data_is_rejected(self):
  for change in [{'total_experts':1},{'players':[]}]:
   with self.assertRaises(ValueError):refresh.snapshot(self.source(**change),NOW)
if __name__=='__main__':unittest.main()
