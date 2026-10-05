declare module "jsbarcode" {
  interface Options {
    format?: string;
    width?: number;
    height?: number;
    displayValue?: boolean;
    fontSize?: number;
    margin?: number;
    background?: string;
    lineColor?: string;
  }
  export default function JsBarcode(el: SVGSVGElement | string, text: string, options?: Options): void;
}
