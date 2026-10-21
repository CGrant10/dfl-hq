import {describe,it,expect} from 'vitest';
import {memberPhotoCandidates,memberPhoto,sleeperAvatarUrl} from './member-photo.js';
import {currentTeamMembers,currentTradeNames} from './current-team-names.js';
import {currentAnalyzerRoster} from './analyzer-league-context.js';
import {teamPortrait} from './team-presentation.js';
const m={id:1,sleeper_user_id:'owner',team_name:'Current Team',profile_image:'https://example.com/dfl.jpg'};
const user={user_id:'owner',avatar:'profile-hash',metadata:{team_name:'Live team',avatar:'https://sleepercdn.com/uploads/team.jpg'}};
describe('member portrait preference',()=>{
 it('hydrates current Sleeper pictures throughout the shared directory without overwriting the upload',()=>{
  const [member]=currentTeamMembers([m],[user]);
  expect(member).toMatchObject({profile_image:m.profile_image,sleeper_team_image:user.metadata.avatar,sleeper_profile_image:'https://sleepercdn.com/avatars/thumbs/profile-hash'});
  expect(memberPhotoCandidates(member)).toEqual([user.metadata.avatar,member.sleeper_profile_image,m.profile_image]);
  expect(memberPhoto(m)).toBe(m.profile_image);
 });
 it('respects DFL preference on both identity-only and analyzer team cards',()=>{
  const [member]=currentTeamMembers([{...m,profile_photo_source:'dfl'}],[user]);
  const team=currentAnalyzerRoster({sleeper_user_id:'owner',roster_id:1},member,[user]);
  expect(memberPhotoCandidates(team)).toEqual([m.profile_image,user.metadata.avatar,member.sleeper_profile_image]);
  for(const input of [member,team,{identity:member}])expect(teamPortrait(input)).toContain(`src="${m.profile_image}"`);
 });
 it('falls back without duplicates when a source is unavailable or removed',()=>{
  expect(memberPhotoCandidates({...m,profile_photo_source:'dfl',profile_image:null,sleeper_team_image:user.metadata.avatar,sleeper_profile_image:user.metadata.avatar})).toEqual([user.metadata.avatar]);
  expect(memberPhotoCandidates(null)).toEqual([]);expect(memberPhoto(null)).toBeNull();
  expect(memberPhotoCandidates({...m,profile_photo_source:'future'})).toEqual([m.profile_image]);
 });
 it('refreshes receipt portraits and source without changing frozen grades',()=>{
  const [member]=currentTeamMembers([{...m,profile_photo_source:'dfl'}],[user]);
  const alert={teams:[{member_id:1,team_name:'Old name'}],result:{fairness:73}};
  const next=currentTradeNames(alert,[member]);
  expect(next.teams[0]).toMatchObject({profile_image:m.profile_image,profile_photo_source:'dfl',sleeper_team_image:user.metadata.avatar});
  expect(next.result).toBe(alert.result);expect(memberPhoto(next.teams[0])).toBe(m.profile_image);
 });
 it('accepts Sleeper hashes and HTTPS uploads but rejects unsafe URLs',()=>{
  expect(sleeperAvatarUrl('profile-hash')).toContain('/avatars/thumbs/profile-hash');
  expect(sleeperAvatarUrl(user.metadata.avatar)).toBe(user.metadata.avatar);
  for(const value of ['',null,'http://example.com/avatar','javascript:alert(1)','https://a:b@example.com/avatar'])expect(sleeperAvatarUrl(value)).toBeNull();
 });
});
