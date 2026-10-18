"""Read-only release verification against the public GitHub Pages app."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess
import time
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
BASE='https://cgrant10.github.io/dfl-hq/'
VERSION=(ROOT/'version.txt').read_text().strip()

def read(path,attempt):
    url=BASE+path+'?dfl-release-verify='+VERSION+'&attempt='+str(attempt)
    with urllib.request.urlopen(url,timeout=20) as response:
        return response.read()

def changed_files():
    result=subprocess.run(['git','diff','--no-renames','--name-only','HEAD^','HEAD'],cwd=ROOT,text=True,capture_output=True)
    candidates=result.stdout.splitlines() if result.returncode==0 else []
    candidates+=['index.html','version.txt','sw.js','css/app-shared.css','js/bundle/'+VERSION+'/app.js',
        'js/game-day.js','js/lineup-alert-model.js','js/game-day-score-motion.js','js/matchup-banter.js']
    return sorted(set(path for path in candidates if (ROOT/path).is_file() and
        (path in ['index.html','version.txt','sw.js'] or path.startswith(('css/','js/')) and not path.endswith('.spec.js'))))

def main():
    files=changed_files()
    for attempt in range(18):
        try:
            if read('version.txt',attempt).decode().strip()!=VERSION:
                raise ValueError('Public version has not advanced')
            def verify(path):
                if read(path,attempt)!=(ROOT/path).read_bytes():
                    raise ValueError('Public asset differs: '+path)
            with ThreadPoolExecutor(max_workers=4) as pool:
                list(pool.map(verify,files))
            print(str(len(files))+' public assets match release '+VERSION)
            return
        except Exception as error:
            if attempt==17:
                raise RuntimeError('Public release did not match the merged build') from error
            print('Waiting for Pages to serve release '+VERSION,flush=True)
            time.sleep(8)

if __name__=='__main__':
    main()
