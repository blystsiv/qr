import type { TLVParseResult, TLVNode } from "@/lib/types/tlv";

function isDigitPair(value: string): boolean {
  return /^\d{2}$/.test(value);
}

export function parseTlv(payload: string): TLVParseResult {
  const nodes: TLVNode[] = [];
  const errors: string[] = [];
  let index = 0;

  while (index < payload.length) {
    if (index + 4 > payload.length) {
      errors.push(`Truncated tag header at index ${index}.`);
      break;
    }

    const tag = payload.slice(index, index + 2);
    const lengthText = payload.slice(index + 2, index + 4);

    if (!isDigitPair(tag) || !isDigitPair(lengthText)) {
      errors.push(`Invalid tag or length at index ${index}.`);
      break;
    }

    const length = Number(lengthText);
    const valueStart = index + 4;
    const end = valueStart + length;

    if (end > payload.length) {
      errors.push(
        `Tag ${tag} declares length ${length}, but only ${
          payload.length - valueStart
        } characters remain.`,
      );
      break;
    }

    nodes.push({
      tag,
      length,
      value: payload.slice(valueStart, end),
      start: index,
      valueStart,
      end,
    });

    index = end;
  }

  return {
    nodes,
    complete: errors.length === 0 && index === payload.length,
    errors,
    consumedLength: index,
  };
}

export function tryParseNestedTlv(value: string): TLVParseResult | null {
  if (value.length < 4 || !/^\d{4}/.test(value)) {
    return null;
  }

  const parsed = parseTlv(value);
  if (!parsed.nodes.length || !parsed.complete) {
    return null;
  }

  return parsed;
}
