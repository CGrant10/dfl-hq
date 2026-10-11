import {describe,it,expect,vi} from 'vitest';
vi.mock('./advice-receipts-data.js',()=>({loadAdviceReceipts:vi.fn()}));
import {adviceReceiptsHtml} from './advice-receipts-ui.js';
const row={id:1,week:5,kind:'lineup',teamName:'<img src=x onerror=alert(1)>',label:'START <script>attack()</script>',captured_at:'2026-10-11T16:00:00Z',projected_gain:3,grade:'miss',actualGain:-12,added_players:[{name:'<b>Player</b>'}],removed_players:[],addedActual:[2],removedActual:[],copy:'DFL HQ talked shit and got this one wrong.'};
describe('advice receipt presentation',()=>{
 it('escapes names and recommendation labels from public league data',()=>{
  const html=adviceReceiptsHtml({rows:[row]});expect(html).not.toContain('<script>');expect(html).not.toContain('<img');expect(html).toContain('&lt;script&gt;');expect(html).toContain('&lt;b&gt;Player&lt;/b&gt;');
 });
 it('keeps misses, pending calls and the limits of the comparison visible',()=>{
  const html=adviceReceiptsHtml({rows:[row,{...row,id:2,grade:'pending',actualGain:null}]});
  expect(html).toContain('0 hits · 1 miss · 1 pending');expect(html).toContain('-12.00');expect(html).toContain('got this one wrong');expect(html).toContain('doesn’t prove the manager made the move');
 });
});
