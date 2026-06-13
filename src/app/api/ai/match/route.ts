import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    // Authenticate user via Authorization Header ID Token
    const authHeader = req.headers.get("Authorization");
    let user: any = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      try {
        user = await adminAuth.verifyIdToken(idToken);
      } catch (e) {
        console.warn("Failed to verify ID token:", e);
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { incident } = await req.json();

    if (!incident) {
      return NextResponse.json({ error: "Missing 'incident' data" }, { status: 400 });
    }

    try {
      let model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      let usedModel = "gemini-2.5-flash";

      // Fetch volunteers from Firestore
      const volunteersSnap = await adminDb.collection('profiles')
        .where('role', '==', 'volunteer')
        .get();

      const dbVolunteers = volunteersSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

      // Map the database profiles to the format Gemini expects
      const volunteerList = (dbVolunteers || []).map((v: any) => ({
        id: v.id,
        name: v.name || v.metadata?.name || "Unknown Volunteer",
        skills: Array.isArray(v.metadata?.skills) ? v.metadata.skills : (v.metadata?.skills || "").split(",").map((s: string) => s.trim()).filter(Boolean),
        distance_km: v.metadata?.distance_km || 5.0,
        available: v.metadata?.available !== false
      })).filter((v: any) => v.available);

      if (volunteerList.length === 0) {
        return NextResponse.json({ success: true, data: { recommended_volunteers: [], team_composition_notes: "No volunteers available", coverage_gaps: [], dispatch_priority_order: [] } });
      }

      const prompt = `You are a volunteer matching AI for disaster response. Match the best volunteers to this incident.

Incident: ${JSON.stringify(incident)}

Available Volunteers: ${JSON.stringify(volunteerList)}

Return ONLY valid JSON (no markdown, no code fences) with these fields:
{
  "recommended_volunteers": [
    {
      "id": "volunteer id exactly as provided",
      "name": "volunteer name",
      "match_score": 0-100,
      "reasoning": "why this volunteer is a good match",
      "estimated_arrival": "estimated time",
      "assigned_role": "what they should do"
    }
  ],
  "team_composition_notes": "notes about the overall team",
  "coverage_gaps": ["any skills or resources not covered"],
  "dispatch_priority_order": ["ordered list of names to dispatch first"]
}`;

      let result;
      try {
        result = await model.generateContent(prompt);
      } catch (e: any) {
        if (e.message?.includes("503") || e.status === 503) {
          model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
          usedModel = "gemini-2.5-flash-lite";
          result = await model.generateContent(prompt);
        } else {
          throw e;
        }
      }

      const responseText = result.response.text();
      const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const validIds = new Set(volunteerList.map((v: any) => v.id));

      if (parsed.recommended_volunteers && Array.isArray(parsed.recommended_volunteers)) {
        const batch = adminDb.batch();
        const validRecommendations = parsed.recommended_volunteers.filter((v: any) => v.id && validIds.has(v.id));

        validRecommendations.forEach((v: any) => {
          const notifRef = adminDb.collection('notifications').doc();
          batch.set(notifRef, {
            id: notifRef.id,
            user_id: v.id,
            type: "alert",
            title: "AI Auto-Dispatch Priority Match",
            body: `You have been prioritized for a mission. Recommended role: ${v.assigned_role}. Match reasoning: ${v.reasoning}`,
            read: false,
            created_at: new Date().toISOString()
          });
        });

        if (validRecommendations.length > 0) {
          await batch.commit();
        }
      }

      return NextResponse.json({ success: true, data: { ...parsed, _source: usedModel } });
    } catch (apiError: unknown) {
      console.error("Gemini Match API failed:", apiError instanceof Error ? apiError.message : "unknown");
      throw apiError;
    }
  } catch (error: unknown) {
    console.error("Matching API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Matching failed", details: message }, { status: 500 });
  }
}
