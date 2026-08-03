FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY Interfaz /app

# Aquí está la corrección: agregué djangorestframework-simplejwt al final
RUN pip install --no-cache-dir \
    django \
    djangorestframework \
    django-cors-headers \
    psycopg2-binary \
    gunicorn \
    djangorestframework-simplejwt

EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]