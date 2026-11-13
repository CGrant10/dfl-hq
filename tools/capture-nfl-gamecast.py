"""Compatibility entry point for the replaced 1.567 Game Center reference review."""
import os,runpy
from pathlib import Path
os.environ.setdefault('DFL_SCORES_REVIEW_DIR',os.environ.get('DFL_GAMECAST_REVIEW_DIR','/workspace/dfl-scores-review'))
runpy.run_path(str(Path(__file__).with_name('capture-nfl-scores-mobile.py')),run_name='__main__')
