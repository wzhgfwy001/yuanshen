FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/
COPY web/ ./web/
COPY config/ ./config/
COPY prompts/ ./prompts/

# Environment
ENV PYTHONPATH=/app

# Expose port
EXPOSE 5001

# Run
CMD ["python", "-m", "src.api.web_server"]
