"use client";

import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

export function Barcode({ value, height = 44 }: { value: string; height?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current) JsBarcode(ref.current, value, { format: "CODE128", width: 1.6, height, displayValue: true, fontSize: 12, margin: 0, background: "#ffffff", lineColor: "#000000" });
  }, [value, height]);
  return <svg ref={ref} role="img" aria-label={`Barcode ${value}`} />;
}

export function QrCode({ value, size = 84 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let live = true;
    QRCode.toString(value, { type: "svg", margin: 0, color: { dark: "#000000", light: "#ffffff" } }).then((s) => live && setSvg(s));
    return () => {
      live = false;
    };
  }, [value]);
  return <div role="img" aria-label={`QR code ${value}`} style={{ width: size, height: size }} className="[&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
