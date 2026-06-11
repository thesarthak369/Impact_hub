import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types
from supabase import create_client, Client

# 1. Load the secrets from your .env file
load_dotenv()

# 2. Initialize the FastAPI app
app = FastAPI()

# 3. Initialize the Google Gemini Client explicitly for Google Cloud Vertex AI
client = genai.Client(
    vertexai=True,
    project=os.environ.get("GOOGLE_CLOUD_PROJECT"),
    location="us-central1"
)

# Initialize Supabase Client
supabase_url: str = os.environ.get("SUPABASE_URL")
supabase_key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# 4. Define what an incoming data payload looks like
class SMSPayload(BaseModel):
    message: str

# 5. Create the web endpoint that receives the data
@app.post("/api/sms")
async def handle_sms(payload: SMSPayload):
    prompt = f"""
    You are a disaster triage coordinator. Extract the following information from the emergency text message:
    - location: The location of the incident.
    - type: The category of the incident (e.g., 'Water', 'Fire', 'Medical', 'Earthquake', 'Other').
    - priority: The severity level (Must be 'CRITICAL', 'HIGH', 'MEDIUM', or 'LOW').
    - affected: The estimated number of people affected (return as a string, e.g., '10' or 'Unknown').
    - volunteers_needed: Estimate the number of volunteers required to handle this based on the severity (integer).
    - resources_needed: The specific equipment and exact quantities requested (return as a detailed string, e.g., '100 bandages, 2 rescue boats', or 'None').
    
    Return ONLY a valid JSON object with the keys: location, type, priority, affected, volunteers_needed, resources_needed.
    Do not include markdown tags like ```json.
    
    Emergency message: "{payload.message}"
    """
    
    try:
        # Using the standard flash model
        response = client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json", 
            ),
        )
        
        structured_data = json.loads(response.text)
        
        db_response = supabase.table("incidents").insert({
            "location": structured_data.get("location", "Unknown"),
            "type": structured_data.get("type", "Other"),
            "priority": structured_data.get("priority", "HIGH"),
            "status": "Active",
            "affected": structured_data.get("affected", "Unknown"),
            "description": payload.message,
            "volunteers_needed": structured_data.get("volunteers_needed", 0),
            "resources_needed": structured_data.get("resources_needed", "None")
        }).execute()
        
        return {
            "status": "success",
            "extracted_data": structured_data,
            "database_id": db_response.data[0]["id"] if db_response.data else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))