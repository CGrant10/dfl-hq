import {highlightPosterUrl} from './home-highlight-ui.js';
import {describe,it,expect} from 'vitest';
import {highlightSession,gameHighlightClips,activeHighlightClips,highlightVideoUrl} from './home-highlight-model.js';
const now=Date.parse('2026-10-25T22:00:00Z'),event={id:'401',date:'2026-10-25T17:00:00Z',competitions:[{competitors:[{team:{abbreviation:'KC'}},{team:{abbreviation:'BUF'}}]}]};
const video=changes=>({id:123,source:'espn',tracking:{leagueName:'NFL',coverageType:'OnePlay'},headline:'Receiver scores a 49-yard touchdown',description:'A touchdown catch',duration:27,thumbnail:'https://espnmedia-cdn.akamaized.net/highlight.jpg',originalPublishDate:'2026-10-25T18:00:00Z',timeRestrictions:{expirationDate:'2026-10-27T18:00:00Z'},links:{web:{href:'https://www.espn.com/video/clip/_/id/123/receiver-td'},source:{href:'https://espnmedia-cdn.akamaized.net/espn/media/16x9/clip.mp4'}},...changes});
const parse=(videos=[video()],e=event,at=now)=>gameHighlightClips({header:{id:e.id},videos},e,{now:at});
it('labels a long catch that sets up a later touchdown as a big play',()=>{expect(parse([video({headline:'A receiver’s 51-yard catch sets up a touchdown'})])[0].kind).toBe('big-play')});
describe('weekend Central highlight windows',()=>{
 it.each([
  ['2026-10-26T22:00:00Z','2026-10-22','2026-10-27T11:00:00.000Z',true],
  ['2026-10-27T10:59:59Z','2026-10-22','2026-10-27T11:00:00.000Z',true],
  ['2026-10-27T11:00:00Z','2026-10-22','2026-10-27T11:00:00.000Z',false],
  ['2026-10-28T22:00:00Z','2026-10-22','2026-10-27T11:00:00.000Z',false],
  ['2026-10-29T10:59:59Z','2026-10-22','2026-10-27T11:00:00.000Z',false],
  ['2026-10-29T11:00:00Z','2026-10-29','2026-11-03T12:00:00.000Z',true],
  ['2026-11-01T11:59:59Z','2026-10-29','2026-11-03T12:00:00.000Z',true],
  ['2026-03-08T10:59:59Z','2026-03-05','2026-03-10T11:00:00.000Z',true],
 ])('keeps the weekend across morning, midnight and DST: %s',(at,start,expiry,active)=>{
  const s=highlightSession(Date.parse(at));expect(s.startDate).toBe(start);expect(new Date(s.expiresAt).toISOString()).toBe(expiry);expect(s.active).toBe(active);
 });
 it('keeps Sunday available Monday and removes the whole weekend Tuesday morning',()=>{
  const clips=parse();expect(activeHighlightClips(clips,Date.parse('2026-10-26T22:00:00Z'))).toHaveLength(1);
  expect(activeHighlightClips(clips,Date.parse('2026-10-27T11:00:00Z'))).toEqual([]);
  expect(activeHighlightClips(clips,Date.parse('2026-10-29T22:00:00Z'))).toEqual([]);
 });
 it('includes Thursday through Monday, with the same Tuesday cutoff',()=>{
  for(const date of ['22','23','24','25','26']){
   const e={...event,date:`2026-10-${date}T17:00:00Z`};
   expect(parse([video({originalPublishDate:`2026-10-${date}T18:00:00Z`})],e,Date.parse('2026-10-26T22:00:00Z'))[0]).toMatchObject({session_date:`2026-10-${date}`,expires_at:'2026-10-27T11:00:00.000Z'});
  }
 });
 it('does not collect upcoming games, previous weekends or footage between weekends',()=>{
  expect(parse([video()],{...event,date:'2026-10-18T17:00:00Z'})).toEqual([]);
  expect(parse([video()],{...event,date:'2026-10-26T17:00:00Z'})).toEqual([]);
  expect(parse([video()],event,Date.parse('2026-10-28T22:00:00Z'))).toEqual([]);
 });
});
describe('verified publisher clip metadata',()=>{
 it('only plays direct HTTPS publisher MP4 sources and degrades unsafe URLs to source playback',()=>{
  const good='https://espnmedia-cdn.akamaized.net/espn/media/16x9/clip.mp4';expect(highlightVideoUrl(good)).toBe(good);
  for(const value of ['javascript:alert(1)','http://espnmedia-cdn.akamaized.net/espn/media/clip.mp4','https://espnmedia-cdn.akamaized.net.evil.test/espn/media/clip.mp4','https://user@espnmedia-cdn.akamaized.net/espn/media/clip.mp4','https://espnmedia-cdn.akamaized.net/espn/media/clip.mp4?redirect=1','https://espnmedia-cdn.akamaized.net/espn/media/clip.m3u8'])expect(highlightVideoUrl(value)).toBeNull();
  const clips=parse();expect(activeHighlightClips([{...clips[0],video_url:'https://evil.test/clip.mp4'}],now)[0].video_url).toBeNull();
 });
 it('requests correctly sized publisher posters instead of full-resolution media',()=>{
  expect(new URL(highlightPosterUrl(video().thumbnail)).searchParams.get('w')).toBe('640');
  expect(new URL(highlightPosterUrl(video().thumbnail,320)).searchParams.has('h')).toBe(false);
  expect(new URL(highlightPosterUrl(video().thumbnail)).searchParams.has('scale')).toBe(false);
  expect(highlightPosterUrl('https://evil.test/track.jpg')).toBeNull();
 });
 it('uses real one-play metadata, canonical source links and the morning deadline',()=>{
  expect(parse()[0]).toMatchObject({id:'123',game_id:'401',session_date:'2026-10-25',kind:'touchdown',expires_at:'2026-10-27T11:00:00.000Z',video_url:'https://espnmedia-cdn.akamaized.net/espn/media/16x9/clip.mp4',source_url:'https://www.espn.com/video/clip/_/id/123'});
 });
 it('includes genuine big catches and interceptions without turning field goals or recaps into plays',()=>{
  expect(parse([video({headline:'A 49-yard completion',description:''})])[0].kind).toBe('big-play');
  expect(parse([video({headline:'Diving pick by the linebacker',description:''})])[0].kind).toBe('big-play');
  expect(parse([video({headline:'A 47-yard FG',description:''})])).toEqual([]);
  expect(parse([video({tracking:{leagueName:'NFL',coverageType:'Final Game Highlight'}})])).toEqual([]);
 });
 it('does not turn a non-scoring end-zone interception into a touchdown clip',()=>{
  expect(parse([video({headline:'Defender picks off a pass in the end zone',description:'An interception ends the drive'})])[0].kind).toBe('big-play');
 });
 it('rejects unrelated games, old footage, embargoed/expired clips and unsafe source assets',()=>{
  expect(gameHighlightClips({header:{id:'wrong'},videos:[video()]},event,{now})).toEqual([]);
  for(const changes of [{originalPublishDate:'2026-10-24T18:00:00Z'},{originalPublishDate:'2026-10-26T18:00:00Z'},{thumbnail:'https://evil.test/x.jpg'},{links:{web:{href:'https://www.espn.com.evil.test/video/clip/_/id/123'}}},{timeRestrictions:{embargoDate:'2026-10-26T18:00:00Z'}},{timeRestrictions:{expirationDate:'2026-10-25T18:00:00Z'}},{duration:999}])expect(parse([video(changes)])).toEqual([]);
 });
 it('honors a publisher expiration earlier than the league morning cutoff',()=>{
  const clips=parse([video({timeRestrictions:{expirationDate:'2026-10-25T23:00:00Z'}})]);
  expect(clips[0].expires_at).toBe('2026-10-25T23:00:00.000Z');expect(activeHighlightClips(clips,Date.parse('2026-10-25T23:00:00Z'))).toEqual([]);
 });
 it('deduplicates the chronological reel and rejects corrupted or untrusted cached rows',()=>{
  const clips=parse();expect(activeHighlightClips([...clips,...clips],now)).toHaveLength(1);
  for(const changes of [{source_url:'javascript:alert(1)'},{session_date:'2026-10-18'},{duration:-1},{expires_at:'2026-10-28T18:00:00Z'}])expect(activeHighlightClips([{...clips[0],...changes}],now)).toEqual([]);
 });
});
