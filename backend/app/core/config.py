import os

# Roboflow settings
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "YOUR_API_KEY")
ROBOFLOW_MODEL = os.getenv("ROBOFLOW_MODEL", "workspace/project_name/version")
CONF_THRESHOLD = float(os.getenv("CONF_THRESHOLD", 0.4))

# Cache settings
CACHE_ENABLED = True
CACHE_TTL = 3600  # seconds