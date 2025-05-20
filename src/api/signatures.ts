import { supabase } from "@/integrations/supabase/client";

/** 'client'  = the customer signs
 *  'contractor' = you (or staff) sign
 */
export type Signer = "client" | "contractor";

/**
 * Write a signature and keep both the new table **and** the legacy
 * columns in sync so older components continue to work.
 */
export async function saveSignature(
  leadId: string,
  signature: string,
  signer: Signer
) {
  /** ① upsert into the dedicated signature table */
  const { error: sigErr } = await supabase
    .from("lead_signatures")
    .upsert(
      { lead_id: leadId, signer, signature },
      { onConflict: "lead_id,signer" }
    );

  if (sigErr) throw sigErr;

  /** ② also mirror into the `leads` row so existing UI keeps working */
  const leadUpdate =
    signer === "client"
      ? {
          client_signature: signature,
          client_signature_date: new Date().toISOString(),
          status: "in-progress",
        }
      : {
          contractor_signature: signature,
          contractor_signature_date: new Date().toISOString(),
          status: "approved",
        };

  const { error: leadErr } = await supabase
    .from("leads")
    .update(leadUpdate)
    .eq("id", leadId);

  if (leadErr) throw leadErr;
}
