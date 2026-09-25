declare module "fit-file-parser" {
  export interface FitParserOptions {
    force?: boolean;
    speedUnit?: string;
    lengthUnit?: string;
    temperatureUnit?: string;
    elapsedRecordField?: boolean;
    mode?: "list" | "cascade" | "both";
  }
  export type FitCallback = (error: string | null, data: unknown) => void;
  export default class FitParser {
    constructor(options?: FitParserOptions);
    parse(content: ArrayBuffer | Uint8Array, callback: FitCallback): void;
  }
}
