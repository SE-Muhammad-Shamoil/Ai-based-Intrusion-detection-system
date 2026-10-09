export const CLASS_COLORS: Record<string, string> = {
  Normal: "#10B981",
  Generic: "#6366F1",
  Exploits: "#F43F5E",
  Fuzzers: "#F59E0B",
  DoS: "#8B5CF6",
  Reconnaissance: "#0EA5E9",
  Analysis: "#14B8A6",
  Backdoor: "#EC4899",
  Shellcode: "#64748B",
  Worms: "#65A30D",
};

export function getClassColor(className: string): string {
  return CLASS_COLORS[className] || "#64748B";
}

export const ALL_CLASSES = [
  "Normal",
  "Generic",
  "Exploits",
  "Fuzzers",
  "DoS",
  "Reconnaissance",
  "Analysis",
  "Backdoor",
  "Shellcode",
  "Worms",
];
