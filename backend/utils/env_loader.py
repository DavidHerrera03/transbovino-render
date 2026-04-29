import os
from pathlib import Path


def load_project_env() -> str:
    """Load backend/.env with python-dotenv when available, otherwise parse manually."""
    env_path = Path(__file__).resolve().parents[1] / '.env'

    try:
        from dotenv import load_dotenv  # type: ignore
        load_dotenv(env_path, override=False)
        return str(env_path)
    except Exception:
        if env_path.exists():
            for raw_line in env_path.read_text(encoding='utf-8').splitlines():
                line = raw_line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                os.environ.setdefault(key, value)
        return str(env_path)
