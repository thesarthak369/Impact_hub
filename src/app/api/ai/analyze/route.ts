import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Server-side geocoding using Google Maps REST API
async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || !location || location === "Unknown Location") return null;
  try {
    const encoded = encodeURIComponent(location + ", India");
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`);
    const data = await res.json();
    if (data.status === "OK" && data.results?.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      console.log(`[SERVER GEOCODE] ${location} => ${lat}, ${lng}`);
      return { lat, lng };
    }
    console.warn(`[SERVER GEOCODE] No results for: ${location}, status: ${data.status}`);
    return null;
  } catch (err) {
    console.error(`[SERVER GEOCODE] Failed for: ${location}`, err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { text, reporter_name, reporter_mobile, preview_only, edited_data } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing 'text' field" }, { status: 400 });
    }

    // Authenticate user via Authorization Header ID Token
    const authHeader = req.headers.get("Authorization");
    let user: any = null;
    let userRole: string | null = null;
    let ngoName: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      try {
        user = await adminAuth.verifyIdToken(idToken);
        const profileSnap = await adminDb.collection('profiles').doc(user.uid).get();
        const profile = profileSnap.exists ? profileSnap.data() : null;
        userRole = profile?.role || null;
        ngoName = profile?.metadata?.orgName || profile?.name || user.name;
      } catch (e) {
        console.warn("Failed to verify ID token or profile:", e);
      }
    }

    const isNgo = userRole === 'ngo';

    const reporterName = typeof reporter_name === "string" && reporter_name.trim() 
      ? reporter_name.trim() 
      : ngoName || user?.name || user?.email || "Anonymous";
    const reporterMobile = typeof reporter_mobile === "string" ? reporter_mobile.trim() : "";

    // === SERVER-SIDE PHONE VALIDATION ===
    const phoneDigits = reporterMobile.replace(/\D/g, "");
    if (phoneDigits.length < 10 && !isNgo) {
      return NextResponse.json({
        error: "Invalid phone number",
        details: "Phone number must contain at least 10 digits. Please provide a valid, reachable contact number."
      }, { status: 400 });
    }

    try {
      let model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      let usedModel = "gemini-2.5-flash";

      const prompt = `You are an emergency response NLP engine for "Impact Hub" — a humanitarian disaster relief and community impact platform. Your job is to:
1. Check if this report is a GENUINE emergency related to our concept (disasters, humanitarian crises, community safety, medical emergencies, infrastructure damage, evacuations, resource shortages like food/water/shelter).
2. Validate the reporter's phone number.
3. Extract structured data from the report.

Field Report: "${text}"
Reporter Phone: "${reporterMobile}"

IMPORTANT RULES:
- If the report is about something UNRELATED to disaster relief, humanitarian aid, or community emergencies (e.g., ordering food delivery, tech support, jokes, random text, advertising, personal complaints unrelated to emergencies), set "is_relevant" to false.
- If the phone number looks fake, has repeating digits like 0000000000 or 1234567890, or is clearly not a real number, set "phone_valid" to false.

Return ONLY valid JSON (no markdown, no code fences) with these fields:
{
  "is_relevant": true or false (is this report about a real disaster/humanitarian/community emergency?),
  "rejection_reason": "if is_relevant is false, explain why in one sentence. If relevant, set to null",
  "phone_valid": true or false (does the phone number look like a real, reachable number?),
  "phone_issue": "if phone_valid is false, explain why in one sentence. If valid, set to null",
  "location": "extracted location or 'Unknown'",
  "resource_needed": "what resource/help is needed",
  "priority": "CRITICAL or HIGH or NORMAL based on urgency",
  "affected_count": "number of people affected or 'Unknown'",
  "category": "one of: Water, Medical, Food, Shelter, Evacuation, Infrastructure, Other",
  "summary": "one-line summary of the situation",
  "recommended_action": "what action should be taken immediately",
  "volunteers_needed": "a number representing how many volunteers are needed based on severity (e.g., 5, 10, 50)",
  "confidence_score": a number 0-100 representing extraction confidence
}`;

      let result;
      try {
        result = await model.generateContent(prompt);
      } catch (e: any) {
        if (e.message?.includes("503") || e.status === 503) {
          model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
          usedModel = "gemini-2.5-flash-lite";
          result = await model.generateContent(prompt);
        } else { throw e; }
      }

      const responseText = result.response.text();
      const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // === RELEVANCE CHECK ===
      if (parsed.is_relevant === false && !isNgo) {
        return NextResponse.json({
          error: "Report not relevant",
          details: parsed.rejection_reason || "This does not appear to be a disaster, humanitarian, or community emergency report. Impact Hub only processes genuine emergency and relief requests."
        }, { status: 400 });
      }

      // === PHONE VALIDATION (AI-assisted) ===
      if (parsed.phone_valid === false && !isNgo) {
        return NextResponse.json({
          error: "Invalid phone number",
          details: parsed.phone_issue || "The phone number provided does not appear to be a valid, reachable number. Please enter a real contact number so responders can follow up."
        }, { status: 400 });
      }

      // === LOCATION VALIDATION ===
      const loc = (parsed.location || "").trim().toLowerCase();
      if (!loc || loc === "unknown" || loc === "not mentioned" || loc === "n/a" || loc === "unspecified") {
        if (!isNgo) {
          return NextResponse.json({
            error: "Location is required",
            details: "Your field report must mention a specific place/area/city. AI could not extract any location. Please include a location and try again."
          }, { status: 400 });
        } else {
          parsed.location = "Unknown Location";
        }
      }

      const confidenceScore = typeof parsed.confidence_score === "number" ? parsed.confidence_score : (isNgo ? 100 : 0);
      const isHighConfidence = isNgo || confidenceScore > 85;
      const incidentStatus = isHighConfidence ? "Active" : "Pending Review";

      // === PREVIEW MODE: Return AI briefing for editing without saving ===
      if (preview_only) {
        return NextResponse.json({
          success: true,
          preview: true,
          data: {
            location: parsed.location || "Unknown Location",
            category: parsed.category || "General",
            priority: parsed.priority || "NORMAL",
            affected_count: parsed.affected_count || "Unknown",
            summary: parsed.summary || "",
            recommended_action: parsed.recommended_action || "",
            resource_needed: parsed.resource_needed || "",
            volunteers_needed: parsed.volunteers_needed || "0",
            confidence_score: confidenceScore,
            ai_verified: isHighConfidence,
          }
        });
      }

      // === CONFIRM MODE: If edited_data was passed, use those values instead ===
      if (edited_data) {
        parsed.location = edited_data.location || parsed.location;
        parsed.category = edited_data.category || parsed.category;
        parsed.priority = edited_data.priority || parsed.priority;
        parsed.affected_count = edited_data.affected_count || parsed.affected_count;
        parsed.summary = edited_data.summary || parsed.summary;
        parsed.recommended_action = edited_data.recommended_action || parsed.recommended_action;
        parsed.resource_needed = edited_data.resource_needed || parsed.resource_needed;
        parsed.volunteers_needed = edited_data.volunteers_needed || parsed.volunteers_needed;
      }

      // Save to Firestore Incidents
      const incidentRef = adminDb.collection('incidents').doc();
      const incidentId = incidentRef.id;
      
      // Server-side geocoding for accurate map pins
      const coords = await geocodeLocation(parsed.location || "");

      const incidentData = {
        id: incidentId,
        location: parsed.location || "Unknown Location",
        lat: coords?.lat || null,
        lng: coords?.lng || null,
        type: parsed.category || "General",
        priority: parsed.priority || "NORMAL",
        status: incidentStatus,
        affected: parsed.affected_count || "Unknown",
        description: [
          parsed.summary || "",
          `Emergency user: ${reporterName}`,
          reporterMobile ? `Phone: ${reporterMobile}` : "",
          `AI Confidence: ${confidenceScore}%${!isHighConfidence ? " — PENDING HUMAN VERIFICATION" : ""}`,
          `Posted at: ${new Date().toISOString()}`
        ].filter(Boolean).join(" | "),
        volunteers_needed: parseInt(parsed.volunteers_needed) || 0,
        created_by: user?.uid || null,
        created_at: new Date().toISOString()
      };
      
      await incidentRef.set(incidentData);

      const emergencySubmissionPayload = {
        source: "text",
        input_text: text,
        reporter_name: reporterName,
        reporter_mobile: reporterMobile,
        submitted_at: new Date().toISOString(),
        parsed,
        incident_id: incidentId,
        created_by: user?.uid || null,
      };

      // Save to emergency submissions
      const submissionRef = adminDb.collection('emergency_submissions').doc();
      await submissionRef.set({
        id: submissionRef.id,
        incident_id: incidentId,
        submitted_by_user_id: user?.uid || null,
        reporter_name: reporterName,
        reporter_mobile: reporterMobile,
        report_mode: "text",
        location: parsed.location || "Unknown Location",
        details: [
          parsed.summary || "",
          `Emergency user: ${reporterName}`,
          reporterMobile ? `Phone: ${reporterMobile}` : "",
          `Posted at: ${new Date().toISOString()}`,
        ].filter(Boolean).join(" | "),
        priority: parsed.priority || "NORMAL",
        category: parsed.category || "General",
        status: incidentStatus,
        posted_at: new Date().toISOString(),
        payload: { ...emergencySubmissionPayload, confidence_score: confidenceScore, is_verified: isHighConfidence },
        created_at: new Date().toISOString()
      });

      // Save NLP extraction
      if (user) {
        const profileSnap = await adminDb.collection('profiles').doc(user.uid).get();
        const role = profileSnap.exists ? profileSnap.data()?.role : null;
        
        const extractionRef = adminDb.collection('nlp_extractions').doc();
        await extractionRef.set({
          id: extractionRef.id,
          user_id: user.uid,
          role_tag: role || null,
          raw_text: text,
          extracted_data: parsed,
          created_at: new Date().toISOString()
        });
      }

      // === CONFIDENCE-BASED ROUTING ===
      if (isHighConfidence) {
        // HIGH CONFIDENCE (>85%): Direct dispatch — broadcast to ALL responders
        try {
          const profilesSnap = await adminDb.collection('profiles').get();
          const responderProfiles = profilesSnap.docs
            .map((d: any) => ({ id: d.id, ...d.data() }))
            .filter((p: any) => p.role === 'volunteer' || p.role === 'ngo');

          const batch = adminDb.batch();
          responderProfiles.forEach((profile: any) => {
            const notifRef = adminDb.collection('notifications').doc();
            batch.set(notifRef, {
              id: notifRef.id,
              user_id: profile.id,
              type: "alert",
              title: `🚨 EMERGENCY: ${parsed.category || "General"} in ${parsed.location}`,
              body: `${ngoName} reported a ${parsed.priority || "HIGH"} emergency. ${parsed.summary || parsed.recommended_action || "Immediate response required."}${reporterMobile ? ` Contact: ${reporterMobile}` : ""} [AI Confidence: ${confidenceScore}% — Auto-verified]`,
              read: false,
              created_at: new Date().toISOString()
            });
          });
          await batch.commit();
        } catch (broadcastErr) {
          console.error("Emergency broadcast failed (non-critical):", broadcastErr);
        }
      } else {
        // LOW CONFIDENCE (≤85%): Forward to review team — only notify NGOs + Admins
        try {
          const profilesSnap = await adminDb.collection('profiles').get();
          const reviewerProfiles = profilesSnap.docs
            .map((d: any) => ({ id: d.id, ...d.data() }))
            .filter((p: any) => p.role === 'ngo' || p.metadata?.is_admin === true);

          const batch = adminDb.batch();
          reviewerProfiles.forEach((profile: any) => {
            const notifRef = adminDb.collection('notifications').doc();
            batch.set(notifRef, {
              id: notifRef.id,
              user_id: profile.id,
              type: "alert",
              title: `⚠️ REVIEW NEEDED: ${parsed.category || "General"} in ${parsed.location}`,
              body: `${ngoName} reported an emergency with LOW AI confidence (${confidenceScore}%). This report needs human verification before dispatch. ${parsed.summary || "Please review and verify."}${reporterMobile ? ` Contact: ${reporterMobile}` : ""}`,
              read: false,
              created_at: new Date().toISOString()
            });
          });
          await batch.commit();
        } catch (broadcastErr) {
          console.error("Review notification failed (non-critical):", broadcastErr);
        }
      }

      // === AUTO-MATCH ===
      if (isHighConfidence) {
        try {
          const volunteersSnap = await adminDb.collection('profiles').where('role', '==', 'volunteer').get();
          const volunteers = volunteersSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

          if (volunteers && volunteers.length > 0) {
            const volList = volunteers.map((v: any) => ({
              id: v.id,
              name: v.name || "Volunteer",
              skills: Array.isArray(v.metadata?.skills) ? v.metadata.skills : (v.metadata?.skills || "").split(",").map((s: string) => s.trim()).filter(Boolean),
              location: v.metadata?.location || "India"
            }));

            const validVolunteerIds = new Set(volList.map((v: any) => v.id));

            let matchModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
            const matchPrompt = `You are a volunteer matching AI. Given this incident and volunteers, identify the best matches.

Incident: { "location": "${parsed.location}", "type": "${parsed.category}", "priority": "${parsed.priority}", "affected": "${parsed.affected_count}", "description": "${parsed.summary}" }

Volunteers: ${JSON.stringify(volList)}

Return ONLY valid JSON (no markdown, no code fences):
{
  "matches": [
    { "id": "volunteer UUID", "name": "name", "score": 0-100, "reason": "short reason why they match" }
  ]
}
Only include volunteers with score >= 50. Use the EXACT id values provided.`;

            const matchResult = await matchModel.generateContent(matchPrompt);
            const matchCleaned = matchResult.response.text().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const matchParsed = JSON.parse(matchCleaned);

            if (matchParsed.matches && Array.isArray(matchParsed.matches)) {
              const batch = adminDb.batch();
              matchParsed.matches
                .filter((m: any) => m.id && m.score >= 50 && validVolunteerIds.has(m.id))
                .forEach((m: any) => {
                  const notifRef = adminDb.collection('notifications').doc();
                  batch.set(notifRef, {
                    id: notifRef.id,
                    user_id: m.id,
                    type: "ai",
                    title: `🧠 AI Match: ${parsed.category} in ${parsed.location}`,
                    body: `${ngoName} reported a ${parsed.priority} incident. AI matched you (score: ${m.score}/100). ${m.reason}. Tap to review and accept.${reporterMobile ? ` Contact: ${reporterMobile}` : ""}`,
                    read: false,
                    created_at: new Date().toISOString()
                  });
                });
              await batch.commit();
            }
          }
        } catch (matchErr) {
          console.error("Auto-match failed (non-critical):", matchErr);
        }
      }

      return NextResponse.json({ 
        success: true, 
        data: { 
          ...parsed, 
          incident_id: incidentId, 
          _source: usedModel,
          ai_verified: isHighConfidence,
          confidence_score: confidenceScore,
          verification_status: isHighConfidence ? "auto_verified" : "pending_review"
        } 
      });
    } catch (apiError: unknown) {
      console.error("Gemini API failed:", apiError instanceof Error ? apiError.message : "unknown");
      throw apiError;
    }
  } catch (error: unknown) {
    console.error("NLP API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "AI processing failed", details: message }, { status: 500 });
  }
}
