import { useQuery } from "@tanstack/react-query";
import { fetchSignatures } from "@/api/signatures";

export function useLeadSignatures(leadId?: string) {
  return useQuery(["lead-signatures", leadId], () => fetchSignatures(leadId!), {
    enabled: !!leadId,
  });
}
