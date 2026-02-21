FROM wmoim/csv2bufr

# Install Flask for the HTTP wrapper
RUN pip3 install --no-cache-dir flask

# Create app directory
WORKDIR /app

# Copy the Flask server
COPY server.py .

# Expose the HTTP port
EXPOSE 5001

# Run the Flask server
CMD ["python3", "server.py"]