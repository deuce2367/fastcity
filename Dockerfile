# Use the official Python base image
FROM python:3.12-slim

ARG user=fastapi

COPY .bashrc /etc/skel/

RUN apt-get update && apt-get upgrade -y && apt-get install -y sqlite-utils python3-mysqldb python3-pymysql vim procps apt-utils curl gpg ca-certificates apt-transport-https apt-utils jq

RUN curl https://packages.fluentbit.io/fluentbit.key | gpg --dearmor > /usr/share/keyrings/fluentbit-keyring.gpg && \
    echo 'deb [signed-by=/usr/share/keyrings/fluentbit-keyring.gpg] https://packages.fluentbit.io/debian/bookworm bookworm main' >> /etc/apt/sources.list && \
    apt-get update && apt-get install -y fluent-bit 

ENV VIRTUAL_ENV=/opt/venv

RUN useradd -m ${user} && \
    mkdir -p /app ${VIRTUAL_ENV} && \
    chown ${user} /app ${VIRTUAL_ENV}

USER ${user}

ENV PATH="$VIRTUAL_ENV/bin:/opt/fluent-bit/bin:$PATH"

RUN python3 -m venv $VIRTUAL_ENV --system-site-packages

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file to the working directory
COPY requirements.txt .

# Install the Python dependencies
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# Copy the application code to the working directory
COPY --chown=${user}:${user} . .

# Expose the port on which the application will run
EXPOSE 8080

# Run the FastAPI application using uvicorn server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]
#CMD ["python", "main.py"]
