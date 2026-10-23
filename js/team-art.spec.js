import {it,expect} from 'vitest';
import {teamArtIndex,teamIllustration} from './team-art.js';
it('keeps the illustration attached to the owner through renames and photo preferences',()=>{
 const member={sleeper_user_id:'474395935292518400',team_name:'Old',profile_photo_source:'sleeper'};
 expect(teamArtIndex(member)).toBe(4);expect(teamArtIndex({identity:{...member,team_name:'New',profile_photo_source:'dfl'}})).toBe(4);
 expect(teamIllustration(member)).toContain('aria-hidden="true"');expect(teamIllustration(member)).not.toContain('Old');
});
it('does not assign a different owner’s illustration using a matching name or an unmapped member id',()=>{
 expect(teamArtIndex({team_name:'The Bayou Bombers',id:5})).toBeNull();expect(teamIllustration({uid:'unknown'})).toBe('');
});
it('selects the last complete atlas character without repeating a neighboring row',()=>{
 expect(teamArtIndex({uid:'474424604178247680'})).toBe(11);const html=teamIllustration({uid:'474424604178247680'});expect(html).toContain('--team-art-x:100%');expect(html).toContain('--team-art-y:92.10526315789474%');
});
