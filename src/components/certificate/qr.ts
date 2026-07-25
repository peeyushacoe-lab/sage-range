import QRCode from "qrcode";

/** Server-side QR render for certificate verify links — navy on transparent SVG. */
export async function certificateQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 0,
    color: { dark: "#1b2a4a", light: "#0000" },
  });
}
