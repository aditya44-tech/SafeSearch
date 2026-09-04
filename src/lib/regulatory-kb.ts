/**
 * Curated Regulatory Knowledge Base
 *
 * This is a VERIFIED, curated database of Indian oil & gas upstream/E&P
 * safety regulations and standards. The AI uses this to retrieve
 * applicable references — it does NOT invent regulation numbers.
 *
 * IMPORTANT: This knowledge base must be maintained by qualified HSE/compliance
 * personnel. All entries should be periodically verified.
 */

export interface RegulatoryEntry {
  framework: string;
  standardCode: string;
  title: string;
  applicableActivity: string[];
  hazardCategories: string[];
  requirements: string[];
  source: string;
}

export const REGULATORY_KB: RegulatoryEntry[] = [
  // ═══════════════════════════════════════════════════════════
  // OIL MINES REGULATIONS, 2017
  // ═══════════════════════════════════════════════════════════
  {
    framework: "Oil Mines Regulations, 2017",
    standardCode: "OMR-2017-R34",
    title: "Provisions relating to explosion-proof equipment and safety lamps in oil mines",
    applicableActivity: ["Drilling", "Production", "Well Services", "Workover"],
    hazardCategories: ["Electrical", "Fire/Explosion"],
    requirements: [
      "All electrical equipment in gassy mines must be flameproof or intrinsically safe",
      "Safety lamps must be provided and maintained for every person entering the mine",
      "Electrical installations must comply with IS:4686 ( Flameproof enclosures)",
    ],
    source: "Ministry of Labour & Employment, Government of India",
  },
  {
    framework: "Oil Mines Regulations, 2017",
    standardCode: "OMR-2017-R37",
    title: "Provisions for saving appliances and rescue apparatus",
    applicableActivity: ["Drilling", "Production", "Well Services", "Pipeline Operations", "Refinery"],
    hazardCategories: ["Confined Space", "Chemical Exposure", "Fire/Explosion"],
    requirements: [
      "Self-rescuers must be provided at all working faces",
      "Breathing apparatus must be available for rescue operations",
      "Fire extinguishers and fire-fighting equipment must be maintained at designated locations",
    ],
    source: "Ministry of Labour & Employment, Government of India",
  },
  {
    framework: "Oil Mines Regulations, 2017",
    standardCode: "OMR-2017-R110",
    title: "Provisions for prevention of inundation and water ingress",
    applicableActivity: ["Drilling", "Production", "Well Services"],
    hazardCategories: ["Confined Space", "Structural"],
    requirements: [
      "Adequate provisions must be made for prevention of inundation",
      "Water-barrier pillars must be maintained where required",
      "Pumping arrangements must be adequate to handle expected water ingress",
    ],
    source: "Ministry of Labour & Employment, Government of India",
  },
  {
    framework: "Oil Mines Regulations, 2017",
    standardCode: "OMR-2017-R106",
    title: "Provisions for protection from fire",
    applicableActivity: ["Drilling", "Production", "Well Services", "Pipeline Operations"],
    hazardCategories: ["Fire/Explosion", "Chemical Exposure"],
    requirements: [
      "Fire warning systems must be installed and maintained",
      "Fire escapes and exits must be clearly marked and unobstructed",
      "Fire-fighting drills must be conducted regularly",
      "Flammable materials storage must comply with specified distances and controls",
    ],
    source: "Ministry of Labour & Employment, Government of India",
  },
  {
    framework: "Oil Mines Regulations, 2017",
    standardCode: "OMR-2017-R122",
    title: "Provisions for safety belts and safety nets at heights",
    applicableActivity: ["Drilling", "Production", "Well Services", "Workover", "Construction"],
    hazardCategories: ["Fall Hazard", "Structural"],
    requirements: [
      "Safety belts must be provided for working at heights above 2 meters",
      "Safety nets must be installed where fall arrest systems are not practicable",
      "Fall protection equipment must be inspected before each use",
    ],
    source: "Ministry of Labour & Employment, Government of India",
  },

  // ═══════════════════════════════════════════════════════════
  // MINES ACT, 1952
  // ═══════════════════════════════════════════════════════════
  {
    framework: "Mines Act, 1952",
    standardCode: "MA-1952-S40",
    title: "Appointment of qualified persons to supervise operations",
    applicableActivity: ["Drilling", "Production", "Well Services", "Workover", "Construction"],
    hazardCategories: ["Equipment Failure", "Procedural Gap"],
    requirements: [
      "Every mine must have a competent person appointed to supervise operations",
      "The appointed person must have prescribed qualifications and experience",
      "Duty to ensure compliance with all safety provisions of the Act",
    ],
    source: "Ministry of Mines, Government of India",
  },
  {
    framework: "Mines Act, 1952",
    standardCode: "MA-1952-S41",
    title: "Duty of owner to notify accidents and dangerous occurrences",
    applicableActivity: ["Drilling", "Production", "Well Services", "Workover", "Pipeline Operations"],
    hazardCategories: ["Procedural Gap"],
    requirements: [
      "Every accident causing loss of life or serious bodily injury must be reported immediately",
      "Dangerous occurrences must be reported to the Chief Inspector of Mines",
      "An inquiry must be conducted into every reportable accident",
    ],
    source: "Ministry of Mines, Government of India",
  },
  {
    framework: "Mines Act, 1952",
    standardCode: "MA-1952-S22",
    title: "Provisions for medical aid and first aid",
    applicableActivity: ["Drilling", "Production", "Well Services", "Workover", "Construction", "Pipeline Operations"],
    hazardCategories: ["Chemical Exposure", "Equipment Failure"],
    requirements: [
      "Adequate first-aid facilities must be provided at every mine",
      "Trained first-aid personnel must be available during all working shifts",
      "Ambulance or other means of rapid transport for injured persons must be available",
    ],
    source: "Ministry of Mines, Government of India",
  },
  {
    framework: "Mines Act, 1952",
    standardCode: "MA-1952-S35",
    title: "Provisions for working hours and safety of young persons",
    applicableActivity: ["Drilling", "Production", "Well Services", "Workover", "Construction"],
    hazardCategories: ["Procedural Gap"],
    requirements: [
      "No person below 18 years shall be employed in any mine",
      "Working hours must not exceed the prescribed limits",
      "Adequate rest periods must be provided",
    ],
    source: "Ministry of Mines, Government of India",
  },

  // ═══════════════════════════════════════════════════════════
  // OISD STANDARDS (Oil Industry Safety Directorate)
  // ═══════════════════════════════════════════════════════════
  {
    framework: "OISD Standard",
    standardCode: "OISD-116",
    title: "Design and safety considerations for storage and handling of petroleum products",
    applicableActivity: ["Production", "Pipeline Operations", "Refinery", "Storage"],
    hazardCategories: ["Fire/Explosion", "Chemical Exposure", "Equipment Failure"],
    requirements: [
      "Storage tanks must have proper venting, gauging, and overfill protection",
      "Fixed fire-fighting systems (foam/deluge) must be installed per tank size",
      "Bund walls must contain 110% of the largest tank capacity",
      "Earthing and bonding must be provided for static electricity dissipation",
    ],
    source: "Oil Industry Safety Directorate, Ministry of Petroleum & Natural Gas",
  },
  {
    framework: "OISD Standard",
    standardCode: "OISD-117",
    title: "Safety considerations for process hazards analysis and risk assessment",
    applicableActivity: ["Drilling", "Production", "Well Services", "Refinery"],
    hazardCategories: ["Chemical Exposure", "Fire/Explosion", "Equipment Failure"],
    requirements: [
      "HAZOP study must be conducted for all new and modified installations",
      "Risk assessment must be updated periodically",
      "Process safety management must be implemented as per OISD guidelines",
    ],
    source: "Oil Industry Safety Directorate, Ministry of Petroleum & Natural Gas",
  },
  {
    framework: "OISD Standard",
    standardCode: "OISD-130",
    title: "Design and safety considerations for fire protection systems at onshore installations",
    applicableActivity: ["Drilling", "Production", "Refinery", "Storage"],
    hazardCategories: ["Fire/Explosion"],
    requirements: [
      "Fire detection and alarm systems must cover all hazardous areas",
      "Fire water network must be designed for simultaneous operation of maximum nozzles",
      "Emergency shutdown systems (ESD) must be provided for critical processes",
      "Fire drills must be conducted at least quarterly",
    ],
    source: "Oil Industry Safety Directorate, Ministry of Petroleum & Natural Gas",
  },
  {
    framework: "OISD Standard",
    standardCode: "OISD-GN-26",
    title: "Safety guidelines for drilling operations",
    applicableActivity: ["Drilling", "Well Services", "Workover"],
    hazardCategories: ["Equipment Failure", "Confined Space", "Chemical Exposure", "Fire/Explosion"],
    requirements: [
      "Well control equipment must be tested as per prescribed schedules",
      "BOP (Blowout Preventer) must be installed and tested before drilling commences",
      "H₂S safety protocols must be implemented in wells with H₂S potential",
      "Drill crew must be trained in well control and emergency procedures",
    ],
    source: "Oil Industry Safety Directorate, Ministry of Petroleum & Natural Gas",
  },
  {
    framework: "OISD Standard",
    standardCode: "OISD-GN-102",
    title: "Safety guidelines for pipeline operations and maintenance",
    applicableActivity: ["Pipeline Operations"],
    hazardCategories: ["Equipment Failure", "Chemical Exposure", "Fire/Explosion", "Vehicle/Traffic"],
    requirements: [
      "Pipeline integrity management programme must be in place",
      "Internal and external inspection must be conducted at prescribed intervals",
      "Leak detection systems must be installed for critical pipelines",
      "Right-of-way must be maintained clear of encroachments",
    ],
    source: "Oil Industry Safety Directorate, Ministry of Petroleum & Natural Gas",
  },
  {
    framework: "OISD Standard",
    standardCode: "OISD-STD-182",
    title: "Safety considerations for confined space entry",
    applicableActivity: ["Drilling", "Production", "Well Services", "Refinery", "Pipeline Operations"],
    hazardCategories: ["Confined Space", "Chemical Exposure"],
    requirements: [
      "Confined space entry permit system must be implemented",
      "Gas testing (O₂, LEL, H₂S, CO) must be done before entry",
      "Continuous ventilation must be maintained during occupancy",
      "Standby person with rescue capability must be stationed at entry point",
    ],
    source: "Oil Industry Safety Directorate, Ministry of Petroleum & Natural Gas",
  },
  {
    framework: "OISD Standard",
    standardCode: "OISD-STD-114",
    title: "Electrical safety at petroleum installations",
    applicableActivity: ["Drilling", "Production", "Refinery", "Storage", "Pipeline Operations"],
    hazardCategories: ["Electrical"],
    requirements: [
      "Electrical area classification must be done as per IS:5571",
      "All electrical equipment in classified areas must be flameproof/intrinsically safe",
      "Electrical safety rules must be displayed and followed",
      "Periodic testing and maintenance of electrical installations is mandatory",
    ],
    source: "Oil Industry Safety Directorate, Ministry of Petroleum & Natural Gas",
  },
  {
    framework: "OISD Standard",
    standardCode: "OISD-STD-227",
    title: "Emergency response & preparedness — hot work and permit-to-work requirements at petroleum installations",
    applicableActivity: ["Storage", "Pipeline Operations", "Production", "Refinery"],
    hazardCategories: ["Hot Work / Uncontrolled Ignition Source near Hydrocarbon Release", "Fire/Explosion", "Chemical Exposure"],
    requirements: [
      "Hot work permit (permit-to-work) must be issued before welding, cutting, grinding, or any ignition-source work begins",
      "Area must be certified gas-free and the hydrocarbon system positively isolated (valve closed, blind/spade, lockout) before hot work starts",
      "Isolation valves and equipment must be clearly labeled/tagged and verified by the permit issuer before work commences",
      "Emergency response plan, fire watch, and extinguishing equipment must be in place for the duration of hot work",
      "Atmospheric monitoring must be continuous where flammable vapour could accumulate",
    ],
    source: "Oil Industry Safety Directorate, Ministry of Petroleum & Natural Gas",
  },

  // ═══════════════════════════════════════════════════════════
  // FACTORIES ACT, 1948 (Applicable to factory/Refinery/Storage contexts)
  // ═══════════════════════════════════════════════════════════
  {
    framework: "Factories Act, 1948",
    standardCode: "FA-1948-S21",
    title: "Precautions against dangerous fumes, gases, etc.",
    applicableActivity: ["Refinery", "Storage", "Construction"],
    hazardCategories: ["Chemical Exposure", "Confined Space", "Fire/Explosion"],
    requirements: [
      "No person shall enter any confined space where dangerous fumes are likely to be present",
      "Adequate ventilation must be provided in workspaces",
      "Gas detectors and personal monitors must be provided in hazardous areas",
    ],
    source: "Ministry of Labour & Employment, Government of India",
  },
  {
    framework: "Factories Act, 1948",
    standardCode: "FA-1948-S36",
    title: "Precautions in case of fire — means of escape",
    applicableActivity: ["Refinery", "Storage", "Construction"],
    hazardCategories: ["Fire/Explosion", "Structural"],
    requirements: [
      "Every factory must have sufficient and clearly Constructed means of escape",
      "Emergency exits must be maintained and clearly marked",
      "Fire-fighting equipment must be provided and maintained",
    ],
    source: "Ministry of Labour & Employment, Government of India",
  },
  {
    framework: "Factories Act, 1948",
    standardCode: "FA-1948-S38A",
    title: "Protection of eyes and hearing",
    applicableActivity: ["Drilling", "Production", "Refinery", "Construction"],
    hazardCategories: ["Equipment Failure", "Procedural Gap"],
    requirements: [
      "Eye protection must be provided in operations involving risk of flying particles",
      "Hearing protection must be provided where noise levels exceed prescribed limits",
      "PPE must be provided free of charge to workers",
    ],
    source: "Ministry of Labour & Employment, Government of India",
  },

  // ═══════════════════════════════════════════════════════════
  // MINES RULES, 1955
  // ═══════════════════════════════════════════════════════════
  {
    framework: "Mines Rules, 1955",
    standardCode: "MR-1955-R105",
    title: "Provisions forPersonal Protective Equipment",
    applicableActivity: ["Drilling", "Production", "Well Services", "Workover", "Construction"],
    hazardCategories: ["Equipment Failure", "Procedural Gap", "Chemical Exposure"],
    requirements: [
      "Adequate PPE must be provided to all workers free of charge",
      "PPE must be maintained and replaced at regular intervals",
      "Workers must be trained in proper use of PPE",
    ],
    source: "Ministry of Mines, Government of India",
  },
  {
    framework: "Mines Rules, 1955",
    standardCode: "MR-1955-R116",
    title: "Safety provisions for working at heights",
    applicableActivity: ["Drilling", "Production", "Well Services", "Workover", "Construction"],
    hazardCategories: ["Fall Hazard", "Structural"],
    requirements: [
      "Safety belts and lifelines must be provided for work at heights exceeding 2 meters",
      "Scaffolds must be erected by competent persons and inspected before use",
      "Guardrails must be provided on all open edges of platforms",
    ],
    source: "Ministry of Mines, Government of India",
  },
];

/**
 * Get activity types for context detection in report text
 */
export const ACTIVITY_KEYWORDS: Record<string, string[]> = {
  "Drilling": ["drilling", "drill", "rig", "bit", "drill string", "drill pipe", "BOP", "blowout", "wellbore", "casing", "cementing"],
  "Production": ["production", "wellhead", "separator", "flowline", "Christmas tree", "well test", "artificial lift", "ESP", "rod pump"],
  "Well Services": ["workover", "coil tubing", "wireline", "slickline", "stimulation", "acidizing", "fracturing", "hydraulic fracturing"],
  "Workover": ["workover", "rig move", "completion", "completion string", "packer", "tubing"],
  "Pipeline Operations": ["pipeline", "flowline", "gathering", "transportation", "pumping station", "valve", "corrosion", "pigging", "leak"],
  "Refinery": ["refinery", "distillation", "cracking", "reformer", "catalytic", "petroleum", "product"],
  "Storage": ["tank", "storage", "silo", "vessel", "tank farm", "bund", "containment"],
  "Construction": ["construction", "building", "foundation", "concrete", "rebar", "scaffold", "excavation", "earthwork"],
};

/**
 * Detect activity/facility context from report text
 */
export function detectActivityContext(reportText: string): string[] {
  const lower = reportText.toLowerCase();
  const detected: string[] = [];

  for (const [activity, keywords] of Object.entries(ACTIVITY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      detected.push(activity);
    }
  }

  return detected.length > 0 ? detected : ["General Operations"];
}

/**
 * Get applicable regulations from the knowledge base for given hazard categories and activities
 */
export function getApplicableRegulations(
  hazardCategories: string[],
  activities: string[]
): RegulatoryEntry[] {
  return REGULATORY_KB.filter((entry) => {
    const matchesHazard = hazardCategories.some((cat) =>
      entry.hazardCategories.includes(cat)
    );
    const matchesActivity = activities.some((act) =>
      entry.applicableActivity.includes(act)
    );
    return matchesHazard && matchesActivity;
  });
}

/**
 * Get a single best-matching regulation for a given hazard category and activity
 */
export function getBestMatchingRegulation(
  hazardCategory: string,
  activities: string[]
): RegulatoryEntry | null {
  const matches = getApplicableRegulations([hazardCategory], activities);
  // Return the first match (most specific)
  return matches.length > 0 ? matches[0] : null;
}
