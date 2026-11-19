import {describe,it,expect} from 'vitest';
import {buildPickemGameContext,pickemSideLine,pickemWeather,pickemGameContext} from './pickem-game-context.js';
const event=()=>({id:'123',weather:{temperature:49,displayValue:'Mostly cloudy'},competitions:[{venue:{indoor:false},competitors:[{homeAway:'away',team:{abbreviation:'IND'}},{homeAway:'home',team:{abbreviation:'HOU'}}],odds:[{provider:{name:'Draft Kings'},pointSpread:{away:{close:{line:'+12.5'}},home:{close:{line:'-12.5'}}},moneyline:{away:{close:{odds:'+502'}},home:{close:{odds:'-700'}}}}]}]});
const game=e=>({provider_event_id:'espn:'+e.id,away_team_id:e.competitions[0].competitors[0].team.abbreviation,home_team_id:e.competitions[0].competitors[1].team.abbreviation,game_context:buildPickemGameContext(e)});
describe('public NFL pick guidance',()=>{
 it('keeps favorite/underdog spreads and moneylines on the correct side',()=>{const g=game(event());expect(pickemSideLine(g,'away')).toMatchObject({tag:'Dog',spread:'+12.5',moneyline:'+502'});expect(pickemSideLine(g,'home')).toMatchObject({tag:'Fav',spread:'−12.5',moneyline:'−700'});});
 it('supports an away favorite without assuming that the home side is favored',()=>{const e=event();e.competitions[0].odds=[{details:'IND -4.5',spread:-4.5}];const g=game(e);expect(pickemSideLine(g,'away')).toMatchObject({tag:'Fav',spread:'−4.5'});expect(pickemSideLine(g,'home')).toMatchObject({tag:'Dog',spread:'+4.5'});});
 it('uses current structured lines instead of an opening favorite flag',()=>{const e=event();e.competitions[0].odds[0].awayTeamOdds={favorite:true};expect(pickemSideLine(game(e),'home').tag).toBe('Fav');});
 it('handles an even line and missing values without manufacturing zero odds',()=>{const e=event();e.competitions[0].odds=[{spread:0}];expect(pickemSideLine(game(e),'home')).toMatchObject({tag:'Even',spread:'',moneyline:''});e.competitions[0].odds=[];expect(pickemSideLine(game(e),'home')).toBeNull();});
 it('rejects inconsistent opposing spreads and leaves missing lines unavailable',()=>{const e=event();e.competitions[0].odds=[{pointSpread:{away:{close:{line:'+3.5'}},home:{close:{line:'-7'}}}}];expect(pickemSideLine(game(e),'away')).toBeNull();});
 it('can identify a moneyline-only favorite using both sides rather than a negative sign',()=>{const e=event();e.competitions[0].odds=[{moneyline:{away:{close:{odds:'-105'}},home:{close:{odds:'-115'}}}}];const g=game(e);expect(pickemSideLine(g,'away').tag).toBe('Dog');expect(pickemSideLine(g,'home').tag).toBe('Fav');});
 it('keeps provider game and team identity scoped, including NFL aliases',()=>{const e=event();e.competitions[0].competitors[0].team.abbreviation='WSH';const g=game(e);expect(pickemGameContext(g).awayTeam).toBe('WAS');expect(pickemGameContext({...g,provider_event_id:'espn:999'})).toBeNull();expect(pickemGameContext({...g,home_team_id:'BUF'})).toBeNull();});
 it('does not invent a context for missing event identity',()=>{expect(buildPickemGameContext({})).toEqual({});});
});
describe('venue weather',()=>{
 it('shows the event forecast temperature and provider conditions',()=>{expect(pickemWeather(game(event()))).toBe('49°F · Mostly cloudy');});
 it('shows an indoor venue instead of outdoor weather for a roofed venue',()=>{const e=event();e.competitions[0].venue.indoor=true;expect(pickemWeather(game(e))).toBe('Indoor venue');});
 it('does not turn missing weather or a daytime high into a kickoff forecast',()=>{const e=event();e.weather={highTemperature:65};expect(pickemWeather(game(e))).toBe('Forecast unavailable');e.weather={temperature:null};expect(pickemWeather(game(e))).toBe('Forecast unavailable');});
 it('keeps freezing/negative forecasts valid and strips markup from conditions',()=>{const e=event();e.weather={temperature:0,displayValue:'<b>Snow</b>'};expect(pickemWeather(game(e))).toBe('0°F · Snow');e.weather.temperature=-5;expect(pickemWeather(game(e))).toBe('−5°F · Snow'.replace('−','-'));});
});
