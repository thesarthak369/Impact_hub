import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// CRITICAL FIX #4: Use service role key for admin operations (fallback to anon for hackathon)
const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(req: Request) {
  try {
    const { text, reporter_name, reporter_mobile } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing 'text' field" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const reporterName = typeof reporter_name === "string" && reporter_name.trim() ? reporter_name.trim() : user?.user_metadata?.full_name || user?.email || "Anonymous";
    const reporterMobile = typeof reporter_mobile === "string" ? reporter_mobile.trim() : "";

    try {
      let model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      let usedModel = "gemini-2.5-flash";

      const prompt = `You are an emergency response NLP engine. Analyze the following field report and extract structured data.

Field Report: "${text}"

Return ONLY valid JSON (no markdown, no code fences) with these fields:
{
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

      // === LOCATION VALIDATION ===
      const loc = (parsed.location || "").trim().toLowerCase();
      if (!loc || loc === "unknown" || loc === "not mentioned" || loc === "n/a" || loc === "unspecified") {
        return NextResponse.json({
          error: "Location is required",
          details: "Your field report must mention a specific place/area/city. AI could not extract any location. Please include a location and try again."
        }, { status: 400 });
      }

      // Get reporter name for display
      let ngoName = reporterName;
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('metadata').eq('id', user.id).single();
        ngoName = profile?.metadata?.full_name || profile?.metadata?.orgName || user.user_metadata?.full_name || reporterName;
      }

      // Save to Supabase Incidents
      const { data: incident, error: insertError } = await adminSupabase
        .from('incidents')
        .insert({
          location: parsed.location || "Unknown Location",
          type: parsed.category || "General",
          priority: parsed.priority || "NORMAL",
          status: "Active",
          affected: parsed.affected_count || "Unknown",
          description: [
            parsed.summary || "",
            `Emergency user: ${reporterName}`,
            reporterMobile ? `Phone: ${reporterMobile}` : "",
            `Posted at: ${new Date().toISOString()}`
          ].filter(Boolean).join(" | "),
          volunteers_needed: parseInt(parsed.volunteers_needed) || 0,
          created_by: user?.id || null
        })
        .select()
        .single();

      const emergencySubmissionPayload = {
        source: "text",
        input_text: text,
        reporter_name: reporterName,
        reporter_mobile: reporterMobile,
        submitted_at: new Date().toISOString(),
        parsed,
        incident_id: incident?.id || null,
        created_by: user?.id || null,
      };

      const { error: submissionError } = await adminSupabase
        .from('emergency_submissions')
        .insert({
          incident_id: incident?.id || null,
          submitted_by_user_id: user?.id || null,
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
          status: "Active",
          posted_at: new Date().toISOString(),
          payload: emergencySubmissionPayload,
        });

      if (insertError) {
        console.error("Error inserting incident:", insertError);
      }

      if (submissionError) {
        console.error("Error inserting emergency submission:", submissionError);
      }

      // Save NLP extraction
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        await adminSupabase.from('nlp_extractions').insert({
          user_id: user.id,
          role_tag: profile?.role || null,
          raw_text: text,
          extracted_data: parsed
        });
      }

      // Broadcast the emergency to all responders first.
      if (incident) {
        try {
          const { data: responderProfiles } = await adminSupabase
            .from('profiles')
            .select('id, role')
            .in('role', ['volunteer', 'ngo']);

          const emergencyNotifications = (responderProfiles || []).map((profile: any) => ({
            user_id: profile.id,
            type: "alert" as const,
            title: `🚨 EMERGENCY: ${parsed.category || "General"} in ${parsed.location}`,
            body: `${ngoName} reported a ${parsed.priority || "HIGH"} emergency. ${parsed.summary || parsed.recommended_action || "Immediate response required."}${reporterMobile ? ` Contact: ${reporterMobile}` : ""}`,
            read: false
          }));

          if (emergencyNotifications.length > 0) {
            await adminSupabase.from('notifications').insert(emergencyNotifications);
          }
        } catch (broadcastErr) {
          console.error("Emergency broadcast failed (non-critical):", broadcastErr);
        }
      }

      // === AUTO-MATCH: Find volunteers and send notifications ===
      if (incident) {
        try {
          const { data: volunteers } = await adminSupabase
            .from('profiles')
            .select('*')
            .eq('role', 'volunteer');

          if (volunteers && volunteers.length > 0) {
            const volList = volunteers.map((v: any) => ({
              id: v.id,
              name: v.name || "Volunteer",
              skills: Array.isArray(v.metadata?.skills) ? v.metadata.skills : (v.metadata?.skills || "").split(",").map((s: string) => s.trim()).filter(Boolean),
              location: v.metadata?.location || "India"
            }));

            // HIGH FIX #9: Build a set of valid IDs to validate AI output
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
              const notifications = matchParsed.matches
                .filter((m: any) => m.id && m.score >= 50 && validVolunteerIds.has(m.id))
                .map((m: any) => ({
                  user_id: m.id,
                  type: "ai" as const,
                  title: `🧠 AI Match: ${parsed.category} in ${parsed.location}`,
                  body: `${ngoName} reported a ${parsed.priority} incident. AI matched you (score: ${m.score}/100). ${m.reason}. Tap to review and accept.${reporterMobile ? ` Contact: ${reporterMobile}` : ""}`,
                  read: false
                }));

              if (notifications.length > 0) {
                await adminSupabase.from('notifications').insert(notifications);
              }
            }
          }
        } catch (matchErr) {
          console.error("Auto-match failed (non-critical):", matchErr);
        }
      }

      return NextResponse.json({ 
        success: true, 
        data: { ...parsed, incident_id: incident?.id, _source: usedModel } 
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
