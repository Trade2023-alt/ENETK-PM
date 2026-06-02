# headlessly parse Microsoft Project (.mpp) files

This directory contains a lightweight Python Flask microservice that containerizes the **MPXJ library** to parse Microsoft Project `.mpp` files.

## 🚀 How to Run the Parser in Docker

### Step 1: Build the Docker Image
From this directory, run:
```bash
docker build -t enetk-mpp-parser .
```

### Step 2: Run the Docker Container
Run the container and expose port `5000`:
```bash
docker run -d -p 5000:5000 --name mpp-parser enetk-mpp-parser
```

### Step 3: Configure your Environment
In your Next.js application, make sure the parser URL is configured in your `.env` file (if deployed, point it to your production microservice):
```env
MPP_PARSER_URL=http://localhost:5000/convert
```

---

## 🛠️ API Endpoint Detail
* **Route**: `POST /convert`
* **Content-Type**: `multipart/form-data`
* **Payload**: `file` (the binary `.mpp` file)
* **Response**:
  ```json
  {
    "status": "success",
    "tasks": [
      {
        "uid": "1",
        "name": "Phase 1: Installation",
        "start": "2026-06-15",
        "finish": "2026-06-20",
        "hours": 40.0,
        "isJob": true,
        "outlineLevel": 1
      }
    ]
  }
  ```
