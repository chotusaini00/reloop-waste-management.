import os, tempfile, pathlib, sys
_tmp = tempfile.mkdtemp()
os.environ["RELOOP_DB_URL"] = f"sqlite:///{pathlib.Path(_tmp) / 'test.db'}"
os.environ["RELOOP_DATA_DIR"] = _tmp
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import pytest
from fastapi.testclient import TestClient

@pytest.fixture(scope="session")
def client():
    from app.main import app
    with TestClient(app) as c:
        yield c
