## 📡 How It Works: The Offline-to-Cloud Pipeline

During a disaster, internet and data networks are usually the first things to go down. Our system is built so that victims don't need an app, a smartphone, or an internet connection to get help. All they need is a basic cellular signal. 

Here is exactly how a simple text message turns into a live rescue mission:

### 1. The SOS Text (No Internet Required)
A victim in a crisis zone takes out any phone (even an old keypad phone) and sends a standard SMS text message to our dedicated Command Hub phone number. They just start the message with our trigger word (e.g., "SOS") and describe their situation. 
* *Example: "SOS structural collapse at sector 4, 10 people trapped, need medics"*

### 2. The Bridge (MacroDroid Intercept)
We have a central Android phone stationed in a safe zone with an internet connection. This phone acts as the bridge. A background automation tool (MacroDroid) constantly listens for incoming texts. The second it sees a text starting with "SOS", it instantly grabs the message and silently forwards it up to our cloud servers.

### 3. The Brain (Google Cloud & AI)
The message arrives at our custom backend, running 24/7 on Google Cloud. We use Google's Gemini AI to instantly read the messy, panicked text message and cleanly extract the exact data our rescue teams need:
* **Location:** Sector 4
* **Type of Emergency:** Structural Collapse
* **Priority:** HIGH
* **Resources Needed:** Medics

### 4. The Live Map (Database & Dashboard)
Once the AI organizes the data, our Python script pushes it straight into our real-time database. The absolute second that data hits the database, our Next.js web dashboard updates automatically. A red priority pin drops onto the live digital map, giving rescue dispatchers the exact coordinates and details they need to send help immediately.