#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
python manage.py descargar_medicamentos 2000 --solo-si-vacia

if [ -n "${DJANGO_SUPERUSER_USERNAME:-}" ] && [ -n "${DJANGO_SUPERUSER_PASSWORD:-}" ]; then
  python -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings'); django.setup(); from django.contrib.auth import get_user_model; U = get_user_model(); u = os.environ['DJANGO_SUPERUSER_USERNAME']; e = os.environ.get('DJANGO_SUPERUSER_EMAIL', ''); p = os.environ['DJANGO_SUPERUSER_PASSWORD']; U.objects.filter(username=u).exists() or U.objects.create_superuser(username=u, email=e, password=p)"
fi
