import os
import sys

# Add the backend directory to the Python path so Django can find its modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()

# Vercel's Python runtime looks for an `app` variable
app = application
