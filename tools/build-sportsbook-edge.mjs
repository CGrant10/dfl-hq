import {build} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await build({configFile:false,root,build:{lib:{entry:root+'supabase/functions/sync-sportsbook-feed/index.ts',formats:['es'],fileName:()=>'index.js'},outDir:process.env.DFL_BOOK_EDGE_DIR||'/tmp/dfl-sportsbook-edge',emptyOutDir:true,minify:false,rollupOptions:{external:id=>id.startsWith('npm:')}}});
