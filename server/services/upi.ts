/**
 * UPI Link & QR code utilities
 */

export interface UpiLinkParams {
  pa: string;       // Payee UPI ID
  pn: string;       // Payee Name
  am: number;       // Amount
  tn?: string;      // Transaction Note
  cu?: string;      // Currency (default INR)
}

export function buildUpiLink(params: UpiLinkParams): string {
  const base = "upi://pay";
  const qs = new URLSearchParams({
    pa: params.pa,
    pn: params.pn,
    am: params.am.toString(),
    tn: params.tn || "Payment",
    cu: params.cu || "INR",
  });
  return `${base}?${qs.toString()}`;
}

export function buildUpiQrData(params: UpiLinkParams): string {
  // Standard UPI QR string (same as upi:// link, apps parse it identically)
  return buildUpiLink(params);
}
