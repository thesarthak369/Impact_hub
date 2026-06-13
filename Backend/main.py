import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types
import datetime
import firebase_admin
from firebase_admin import credentials, firestore

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

# Initialize Firebase Admin
project_id = os.environ.get("FIREBASE_PROJECT_ID")
client_email = os.environ.get("FIREBASE_CLIENT_EMAIL")
private_key = os.environ.get("FIREBASE_PRIVATE_KEY")

if not firebase_admin._apps:
    if project_id and client_email and private_key:
        pk = private_key.replace("\\n", "\n")
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": project_id,
            "private_key": pk,
            "client_email": client_email,
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        firebase_admin.initialize_app(cred)
    else:
        # Fallback to Application Default Credentials
        firebase_admin.initialize_app()

db = firestore.client()

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
        
        # Generate new document ID and save
        doc_ref = db.collection("incidents").document()
        incident_id = doc_ref.id
        
        doc_ref.set({
            "id": incident_id,
            "location": structured_data.get("location", "Unknown"),
            "type": structured_data.get("type", "Other"),
            "priority": structured_data.get("priority", "HIGH"),
            "status": "Active",
            "affected": str(structured_data.get("affected", "Unknown")),
            "description": payload.message,
            "volunteers_needed": int(structured_data.get("volunteers_needed", 0)),
            "resources_needed": structured_data.get("resources_needed", "None"),
            "created_at": datetime.datetime.utcnow().isoformat() + "Z"
        })
        
        return {
            "status": "success",
            "extracted_data": structured_data,
            "database_id": incident_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))