import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('backfield_refresh',Path(__file__).with_name('refresh-backfield-roles.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class BackfieldSnapshot(unittest.TestCase):
    def players(self):
        teams=['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LV','LAC','LAR','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS']
        return {str(i*2+j):{'position':'RB','depth_chart_position':'RB','depth_chart_order':j+1,'team':team,'biography':'unused'} for i,team in enumerate(teams) for j in range(2)}
    def test_keeps_only_current_rb_roles(self):
        players=self.players();players['999']={'position':'WR','depth_chart_position':'WR','depth_chart_order':1,'team':'KC'}
        data=module.snapshot(players,123);self.assertEqual(len(data['players']),64);self.assertEqual(data['players']['0'],{'team':'ARI','order':1});self.assertEqual(data['fetchedAt'],123)
    def test_rejects_partial_source(self):
        with self.assertRaises(ValueError):module.snapshot({},123)
