# Deployment Guide

## Local Deployment (Docker)

1.  **Build the Image**:
    ```bash
    docker-compose build
    ```

2.  **Run the Container**:
    ```bash
    docker-compose up -d
    ```

3.  **Monitor Logs**:
    ```bash
    docker-compose logs -f
    ```

## Cloud Deployment (VPS/Server)

Any VPS with Docker support (e.g., DigitalOcean, AWS EC2, Hetzner) works.

1.  **Provision Server**: Ubuntu 20.04+ recommended.
2.  **Install Docker**:
    ```bash
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    ```
3.  **Clone Repo & Configure**:
    - Clone your repository.
    - Set up `.env`.
4.  **Run**:
    ```bash
    docker compose up -d
    ```

## VNC Security

- The VNC port (5900) is exposed. **Do not leave this open to the public internet** without a firewall or VPN.
- **Recommended**: Use an SSH tunnel to access VNC securely.
    ```bash
    ssh -L 5900:localhost:5900 user@your-server-ip
    ```
    Then connect VNC Viewer to `localhost:5900`.
