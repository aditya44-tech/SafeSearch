// Life-Saving Rules — IOGP Report 459 (2018), as adopted across the Indian
// oil & gas industry (OIL, ONGC, OMCs). Each rule targets a high-risk activity
// where a single worker action can prevent a serious injury or fatality.

export interface LifeSavingRule {
  id: number;
  title: string;
  rule: string;
  actions: string[];
  /** App hazard categories that should surface this rule. */
  hazardCategories: string[];
}

export const LIFE_SAVING_RULES: LifeSavingRule[] = [
  {
    id: 1,
    title: "Bypassing Safety Controls",
    rule: "Obtain authorisation before overriding or disabling any safety control.",
    actions: [
      "I obtain authorisation before overriding or disabling any safety control.",
      "I do not work on equipment that is unsafe or has had a safety control disabled.",
      "I restore safety controls as soon as the work is complete.",
    ],
    hazardCategories: ["Procedural Gap", "Electrical", "Equipment Failure"],
  },
  {
    id: 2,
    title: "Confined Space",
    rule: "Obtain authorisation before entering a confined space.",
    actions: [
      "I obtain authorisation before entering a confined space.",
      "I confirm gas tests have been done and the atmosphere is safe.",
      "I check that rescue arrangements and an attendant are in place.",
    ],
    hazardCategories: ["Confined Space"],
  },
  {
    id: 3,
    title: "Driving",
    rule: "Follow safe driving rules.",
    actions: [
      "I always wear a seatbelt.",
      "I do not exceed the speed limit and reduce my speed for road conditions.",
      "I do not use phones or operate devices while driving.",
      "I am fit and alert to drive.",
    ],
    hazardCategories: ["Vehicle/Traffic"],
  },
  {
    id: 4,
    title: "Energy Isolation",
    rule: "Verify isolation and zero energy state before work begins.",
    actions: [
      "I identify and isolate all energy sources.",
      "I confirm a zero-energy state before work begins.",
      "I apply personal lockout / tagout where required.",
    ],
    hazardCategories: ["Electrical", "Equipment Failure"],
  },
  {
    id: 5,
    title: "Hot Work",
    rule: "Control flammables and ignition sources before starting hot work.",
    actions: [
      "I identify and control all flammable materials and ignition sources.",
      "I confirm gas testing and fire checks before and during work.",
      "I keep fire-fighting equipment ready at the work site.",
    ],
    hazardCategories: ["Fire/Explosion"],
  },
  {
    id: 6,
    title: "Line of Fire",
    rule: "Keep yourself and others out of the line of fire.",
    actions: [
      "I keep myself and others out of the path of moving objects and energy release.",
      "I position myself so I cannot be struck or caught between objects.",
      "I secure tools and materials so they cannot drop on people below.",
    ],
    hazardCategories: ["Vehicle/Traffic", "Equipment Failure", "Structural"],
  },
  {
    id: 7,
    title: "Safe Mechanical Lifting",
    rule: "Plan lifting operations and control the area.",
    actions: [
      "I plan lifting operations and control the area around the load.",
      "I use only certified equipment and verify the load capacity.",
      "I never walk under a suspended load.",
    ],
    hazardCategories: ["Vehicle/Traffic", "Equipment Failure", "Structural"],
  },
  {
    id: 8,
    title: "Work Authorisation",
    rule: "Work with a valid permit when required.",
    actions: [
      "I work only under a valid work permit when required.",
      "I confirm I understand the permit conditions before starting.",
      "I stop work if conditions change beyond the permit scope.",
    ],
    hazardCategories: ["Procedural Gap", "Confined Space", "Fire/Explosion", "Chemical Exposure"],
  },
  {
    id: 9,
    title: "Working at Height",
    rule: "Protect yourself against a fall when working at height.",
    actions: [
      "I protect myself against a fall when working at height.",
      "I check the condition of my fall protection and anchor points.",
      "I secure tools and materials to prevent dropped objects.",
    ],
    hazardCategories: ["Fall Hazard", "Structural"],
  },
];

/** Rules that apply to a report based on its hazard category. */
export function lifeSavingRulesForHazard(category: string | null | undefined): LifeSavingRule[] {
  if (!category) return [];
  const c = category.trim().toLowerCase();
  return LIFE_SAVING_RULES.filter((r) =>
    r.hazardCategories.some((h) => h.toLowerCase() === c)
  );
}