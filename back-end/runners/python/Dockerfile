FROM python:3.12-slim

# Install Flask for the HTTP wrapper. User-adapter dependencies are NOT
# installed here — they are installed lazily into per-adapter venvs at
# first run, cached under <scriptDir>/.installed/.
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Flask server
COPY server.py .

# Expose the HTTP port
EXPOSE 5101

# Run the Flask server
CMD ["python", "server.py"]
