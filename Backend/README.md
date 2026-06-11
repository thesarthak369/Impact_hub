# Impact Hub - SMS Fallback Pipeline

This document explains the step-by-step process of how our SMS Fallback feature works. This feature allows users without internet access to send disaster reports via SMS, which are then automatically processed by our AI (Gemma) and added to the Live Heatmap.

## How the Pipeline Works

1. **User Sends an SMS:** A person in a disaster zone sends an SMS (e.g., "Heavy flooding in sector 4, 3 families stranded") from their phone.
2. **SMS Gateway:** We use an Android app (like "SMS Forwarder") or a service like Twilio to catch this incoming SMS and forward it over the internet to our PC.
3. **Ngrok Tunnel:** Because our Python server is running locally on the PC, the SMS gateway uses an Ngrok URL (e.g., `https://random.ngrok-free.app`) to reach our PC securely over the internet.
4. **FastAPI Webhook:** Our Python server (`main.py`) running on the PC receives the SMS payload on the `/api/sms` endpoint.
5. **Gemma AI Processing:** The Python server takes the text from the SMS and sends it to our local AI model (Gemma, running via Ollama) to extract structured details like location, priority, and resources needed.
6. **Database Update:** Once Gemma returns the structured JSON data, the Python server saves it directly to our Supabase database (into the `incidents` table).
7. **Live Heatmap:** The Next.js frontend is subscribed to the database. As soon as the new incident is saved, the Live Heatmap updates automatically!

## Setup Instructions (Step-by-Step)

### Step 1: Install Python Dependencies
Open your terminal in the `Backend` folder and install the required packages:
```bash
pip install fastapi uvicorn supabase requests python-dotenv pydantic
```

### Step 2: Configure Environment Variables
Create a `.env` file in the `Backend` folder and add your Supabase credentials:
```env
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_service_role_key_here
```

### Step 3: Start the Python Server
Run the FastAPI server:
```bash
uvicorn main:app --reload
```
The server will start at `http://127.0.0.1:8000`.

### Step 4: Expose the Server using Ngrok
In a new terminal window, run Ngrok to expose port 8000:
```bash
ngrok http 8000
```
Copy the `Forwarding` URL (e.g., `https://abc-123.ngrok-free.app`).

### Step 5: Configure the SMS Gateway
Set up your SMS forwarding app (or Twilio webhook) to send incoming messages via POST request to:
`https://abc-123.ngrok-free.app/api/sms`

---
Once this setup is complete, any SMS sent to the designated phone number will automatically flow through the AI and appear on the Impact Hub Live Map!
