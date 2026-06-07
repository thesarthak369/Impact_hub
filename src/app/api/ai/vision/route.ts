import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    const description = formData.get("description") as string | null;
    const location = formData.get("location") as string | null;
    const reporterName = (formData.get("reporter_name") as string | null)?.trim() || user?.user_metadata?.full_name || user?.email || "Anonymous";
    const reporterMobile = (formData.get("reporter_mobile") as string | null)?.trim() || "";

    if (!file && !description) {
      return NextResponse.json({ error: "Provide an image or description" }, { status: 400 });
    }

    // Location is required for heatmap mapping
    if (!location || !location.trim()) {
      return NextResponse.json({ error: "Location is required to map this data to the heatmap." }, { status: 400 });
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
          { text: `You are a disaster damage assessment AI. Analyze this image and provide a damage assessment.

Return ONLY valid JSON (no markdown, no code fences) with these fields:
{
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
        parts = [{ text: `You are a disaster damage assessment AI. Based on this description, provide a damage assessment.

Description: "${description}"

Return ONLY valid JSON (no markdown, no code fences) with these fields:
{
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

      // CRITICAL FIX #2: Save with created_by
      const { data: incident, error: insertError } = await adminSupabase
        .from('incidents')
        .insert({
          location: location.trim(),
          type: parsed.damage_type || "Vision Assessment",
          priority: parsed.severity === "MEDIUM" ? "HIGH" : parsed.severity === "LOW" ? "NORMAL" : parsed.severity || "HIGH",
          status: "Active",
          affected: parsed.estimated_affected_area || "Unknown",
          description: [
            parsed.description || "",
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
        source: "image",
        has_file: Boolean(file),
        location: location.trim(),
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
          report_mode: "image",
          location: location.trim(),
          details: [
            parsed.description || "",
            `Emergency user: ${reporterName}`,
            reporterMobile ? `Phone: ${reporterMobile}` : "",
            `Posted at: ${new Date().toISOString()}`,
          ].filter(Boolean).join(" | "),
          priority: parsed.severity === "MEDIUM" ? "HIGH" : parsed.severity === "LOW" ? "NORMAL" : parsed.severity || "HIGH",
          category: parsed.damage_type || "Vision Assessment",
          status: "Active",
          posted_at: new Date().toISOString(),
          payload: emergencySubmissionPayload,
        });

      if (insertError) {
        console.error("Error inserting incident into Supabase:", insertError);
      }

      if (submissionError) {
        console.error("Error inserting emergency submission:", submissionError);
      }

      if (incident) {
        try {
          const { data: responderProfiles } = await supabase
            .from('profiles')
            .select('id, role')
            .in('role', ['volunteer', 'ngo']);

          const emergencyNotifications = (responderProfiles || []).map((profile: any) => ({
            user_id: profile.id,
            type: "alert" as const,
            title: `🚨 EMERGENCY: ${parsed.damage_type || "Visual incident"} in ${location.trim()}`,
            body: `An emergency image report was submitted by ${reporterName} with ${parsed.severity || "HIGH"} severity. ${parsed.description || "Immediate attention required."}${reporterMobile ? ` Contact: ${reporterMobile}` : ""}`,
            read: false
          }));

          if (emergencyNotifications.length > 0) {
            await supabase.from('notifications').insert(emergencyNotifications);
          }
        } catch (broadcastErr) {
          console.error("Emergency image broadcast failed (non-critical):", broadcastErr);
        }
      }

      return NextResponse.json({ 
        success: true, 
        data: { 
          ...parsed, 
          location: location.trim(),
          incident_id: incident?.id,
          _source: usedModel 
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
