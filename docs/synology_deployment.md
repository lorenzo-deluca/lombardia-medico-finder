# Synology NAS Deployment

## Prerequisites

1.  **Container Manager** (Package Center).
2.  **SSH Access** (Control Panel > Terminal & SNMP > Enable SSH service) - _Required for Method 2_.

---

## Method 1: Container Manager (DSM 7.2+)

1.  **Prepare Files**:

    - Create a folder (e.g., `/docker/cambio-medico`).
    - Upload: `docker-compose.yml`, `.env`.
    - **Note**: Ensure `.env` is correctly configured.

2.  **Create Project**:

    - Open **Container Manager** > **Project** > **Create**.
    - **Project Name**: `cambio-medico`.
    - **Path**: Select the created folder.
    - **Source**: "Use existing docker-compose.yml".

3.  **Build & Run**:
    - The system will build the image and start the container.

---

## Method 2: SSH

1.  **Transfer Files**:

    - Copy the project folder to the NAS.

2.  **Connect**:

    ```bash
    ssh user@nas-ip
    ```

3.  **Deploy**:
    ```bash
    cd /volume1/docker/cambio-medico
    sudo docker-compose up --build -d
    ```
