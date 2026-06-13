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

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    const description = formData.get("description") as string | null;
    const location = formData.get("location") as string | null;
    const safeLocation = location?.trim() || "Unknown Location";
    const reporterName = (formData.get("reporter_name") as string | null)?.trim() || ngoName || user?.name || user?.email || "Anonymous";
    const reporterMobile = (formData.get("reporter_mobile") as string | null)?.trim() || "";

    if (!file && !description) {
      return NextResponse.json({ error: "Provide an image or description" }, { status: 400 });
    }

    // Location is required for heatmap mapping
    if ((safeLocation === "Unknown Location" || !location || !location.trim()) && !isNgo) {
      return NextResponse.json({ error: "Location is required to map this data to the heatmap." }, { status: 400 });
    }

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
      let parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      if (file) {
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        parts = [
          { inlineData: { mimeType: file.type, data: base64 } },
          { text: `You are a disaster damage assessment AI for "Impact Hub" — a humanitarian disaster relief and community impact platform.

Your job is to:
1. Check if this image shows a GENUINE emergency related to our concept (disasters, humanitarian crises, infrastructure damage, medical emergencies, evacuations, floods, fires, earthquakes, etc.).
2. Validate the reporter's phone number.
3. Provide a damage assessment.

Reporter Phone: "${reporterMobile}"

IMPORTANT RULES:
- If the image is NOT related to disaster/humanitarian/community emergencies (e.g., selfies, memes, food photos, screenshots, random objects), set "is_relevant" to false.
- If the phone number looks fake (repeating digits like 0000000000, sequential like 1234567890), set "phone_valid" to false.

Return ONLY valid JSON (no markdown, no code fences) with these fields:
{
  "is_relevant": true or false,
  "rejection_reason": "if is_relevant is false, explain why. If relevant, set to null",
  "phone_valid": true or false,
  "phone_issue": "if phone_valid is false, explain why. If valid, set to null",
  "severity": "CRITICAL or HIGH or MEDIUM or LOW",
  "confidence": a number 0-100,
  "damage_type": "type of damage observed",
  "description": "detailed description of what you see",
  "hazards_identified": ["list", "of", "hazards"],
  "immediate_actions": ["list", "of", "recommended", "actions"],
  "estimated_affected_area": "estimated area description",
  "infrastructure_status": "intact, partial damage, or destroyed",
  "volunteers_needed": "a number representing how many volunteers are needed based on severity (e.g., 5, 10, 50)"
}` },
        ];
      } else {
        parts = [{ text: `You are a disaster damage assessment AI for "Impact Hub" — a humanitarian disaster relief and community impact platform.

Your job is to:
1. Check if this description is about a GENUINE emergency related to our concept (disasters, humanitarian crises, infrastructure damage, medical emergencies, evacuations, floods, fires, earthquakes, etc.).
2. Validate the reporter's phone number.
3. Provide a damage assessment.

Description: "${description}"
Reporter Phone: "${reporterMobile}"

IMPORTANT RULES:
- If the description is NOT related to disaster/humanitarian/community emergencies (e.g., food delivery, tech support, jokes, spam, personal grievances), set "is_relevant" to false.
- If the phone number looks fake (repeating digits like 0000000000, sequential like 1234567890), set "phone_valid" to false.

Return ONLY valid JSON (no markdown, no code fences) with these fields:
{
  "is_relevant": true or false,
  "rejection_reason": "if is_relevant is false, explain why. If relevant, set to null",
  "phone_valid": true or false,
  "phone_issue": "if phone_valid is false, explain why. If valid, set to null",
  "severity": "CRITICAL or HIGH or MEDIUM or LOW",
  "confidence": a number 0-100,
  "damage_type": "type of damage inferred",
  "description": "analysis of the situation",
  "hazards_identified": ["list", "of", "hazards"],
  "immediate_actions": ["list", "of", "recommended", "actions"],
  "estimated_affected_area": "estimated area description",
  "infrastructure_status": "intact, partial damage, or destroyed",
  "volunteers_needed": "a number representing how many volunteers are needed based on severity (e.g., 5, 10, 50)"
}` }];
      }

      let result;
      try {
        result = await model.generateContent(parts);
      } catch (e: any) {
        if (e.message?.includes("503") || e.status === 503) {
          console.warn("503 on gemini-2.5-flash, falling back to gemini-2.5-flash-lite...");
          model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
          usedModel = "gemini-2.5-flash-lite";
          result = await model.generateContent(parts);
        } else {
          throw e;
        }
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

      const confidenceScore = typeof parsed.confidence === "number" ? parsed.confidence : (isNgo ? 100 : 0);
      const isHighConfidence = isNgo || confidenceScore > 85;
      const incidentStatus = isHighConfidence ? "Active" : "Pending Review";

      // Save to Firestore Incidents
      const incidentRef = adminDb.collection('incidents').doc();
      const incidentId = incidentRef.id;

      // Server-side geocoding for accurate map pins
      const coords = await geocodeLocation(safeLocation);

      const incidentData = {
        id: incidentId,
        location: safeLocation,
        lat: coords?.lat || null,
        lng: coords?.lng || null,
        type: parsed.damage_type || "Vision Assessment",
        priority: parsed.severity === "MEDIUM" ? "HIGH" : parsed.severity === "LOW" ? "NORMAL" : parsed.severity || "HIGH",
        status: incidentStatus,
        affected: parsed.estimated_affected_area || "Unknown",
        description: [
          parsed.description || "",
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
        source: "image",
        has_file: Boolean(file),
        location: safeLocation,
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
        report_mode: "image",
        location: safeLocation,
        details: [
          parsed.description || "",
          `Emergency user: ${reporterName}`,
          reporterMobile ? `Phone: ${reporterMobile}` : "",
          `Posted at: ${new Date().toISOString()}`,
        ].filter(Boolean).join(" | "),
        priority: parsed.severity === "MEDIUM" ? "HIGH" : parsed.severity === "LOW" ? "NORMAL" : parsed.severity || "HIGH",
        category: parsed.damage_type || "Vision Assessment",
        status: incidentStatus,
        posted_at: new Date().toISOString(),
        payload: { ...emergencySubmissionPayload, confidence_score: confidenceScore, is_verified: isHighConfidence },
        created_at: new Date().toISOString()
      });

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
              title: `🚨 EMERGENCY: ${parsed.damage_type || "Visual incident"} in ${safeLocation}`,
              body: `An emergency image report was submitted by ${reporterName} with ${parsed.severity || "HIGH"} severity. ${parsed.description || "Immediate attention required."}${reporterMobile ? ` Contact: ${reporterMobile}` : ""} [AI Confidence: ${confidenceScore}% — Auto-verified]`,
              read: false,
              created_at: new Date().toISOString()
            });
          });
          await batch.commit();
        } catch (broadcastErr) {
          console.error("Emergency image broadcast failed (non-critical):", broadcastErr);
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
              title: `⚠️ REVIEW NEEDED: ${parsed.damage_type || "Visual incident"} in ${safeLocation}`,
              body: `${reporterName} submitted an image report with LOW AI confidence (${confidenceScore}%). This report needs human verification before dispatch. ${parsed.description || "Please review."}${reporterMobile ? ` Contact: ${reporterMobile}` : ""}`,
              read: false,
              created_at: new Date().toISOString()
            });
          });
          await batch.commit();
        } catch (broadcastErr) {
          console.error("Review notification failed (non-critical):", broadcastErr);
        }
      }

      return NextResponse.json({ 
        success: true, 
        data: { 
          ...parsed, 
          location: safeLocation,
          incident_id: incidentId,
          _source: usedModel,
          ai_verified: isHighConfidence,
          confidence_score: confidenceScore,
          verification_status: isHighConfidence ? "auto_verified" : "pending_review"
        } 
      });
    } catch (apiError: unknown) {
      console.error("Gemini Vision API failed:", apiError instanceof Error ? apiError.message : "unknown");
      throw apiError;
    }
  } catch (error: unknown) {
    console.error("Vision API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Vision analysis failed", details: message }, { status: 500 });
  }
}
