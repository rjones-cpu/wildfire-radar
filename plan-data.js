/**
 * Site-specific wildfire plan data extracted from:
 *   /workspace/wildfire-preparedness/site-specific-plan.docx
 *   /workspace/wildfire-preparedness/site-specific-plan.pptx
 * Source header: NGTL EXPANSION DVN Spread — Site Specific Wildfire Prevention & Mass Evacuation XX 2021
 * (also references NGTL KARR Project / Karr project work area)
 *
 * RULE: Do not invent content. Gaps are listed explicitly in PLAN_GAPS.
 */
window.WILDFIRE_PLAN = {
  meta: {
    title: "Site Specific Wildfire Prevention & Mass Evacuation",
    site: "NGTL Expansion DVN Spread / NGTL KARR Project",
    documentDateLabel: "XX 2021",
    sources: [
      "site-specific-plan.docx",
      "site-specific-plan.pptx (context/statistics only; no additional operational procedures extracted)"
    ],
    reportWildfire: "310-FIRE (3473)"
  },

  /**
   * Distance-based Wildfire Hazard Zone (WHZ) triggers from the WHZ chart.
   * Levels are evaluated from nearest active fire distance (km). Highest severity wins.
   * Note: Level 2 cell text in the source reads "25 km 50 km" (interpreted as 25–50 km from chart ordering).
   */
  whzLevels: [
    {
      id: "level3",
      name: "WHZ Level 3",
      rangeLabel: "25 km or less",
      maxKm: 25,
      minKm: 0,
      severity: 3,
      actions: [
        "Update Calgary EOC",
        "Maintain contact with ESRD",
        "Initiate full evacuation strategy",
        "Initiate shutdown of all operations",
        "Ready all equipment for safety"
      ]
    },
    {
      id: "level2",
      name: "WHZ Level 2",
      rangeLabel: "25 km to 50 km",
      maxKm: 50,
      minKm: 25,
      severity: 2,
      actions: [
        "Full activation of Emergency Response Plan",
        "Update Calgary EOC",
        "Maintain contact with ESRD",
        "Initiate evacuation strategy",
        "Initiate shutdown of all non-essential operations",
        "Continue to monitor air quality",
        "Initiate mitigation strategy (asset protection)"
      ]
    },
    {
      id: "level1",
      name: "WHZ Level 1",
      rangeLabel: "50 to 100 km",
      maxKm: 100,
      minKm: 50,
      severity: 1,
      actions: [
        "Establish Incident Command Post",
        "Assign Site-wide Emergency Response Team Roles",
        "Monitor egress and Security head count procedures daily",
        "Maintain contact with ESRD",
        "Contact ECC to standby or initiate Calgary EOC",
        "Monitor air quality",
        "Establish evacuation strategy considering non-essential personnel, sensitive individuals",
        "Inventory all resources and equipment",
        "Prepare staging areas",
        "Monitor road conditions and egress routes"
      ]
    },
    {
      id: "alert",
      name: "Alert",
      rangeLabel: "100 to 150 km (monitor radius)",
      maxKm: Infinity,
      minKm: 100,
      severity: 0,
      actions: [
        "Maintain Fire Watch",
        "Update Fire Watch Map and status board",
        "Establish operational requirements monitoring necessary access and deliveries to Camp Laydown"
      ]
    }
  ],

  musterPoints: [
    {
      name: "Laydown yard assembly (on-site)",
      detail: "When stop-work & assemble is ordered by the 3 Incident Commanders (TCE, Royal, SMJV), crews in the field are notified via cell phone or radio to stop work and assemble in the laydown yard on Road 24.",
      steps: [
        "Park vehicles in designated parking areas and walk to your company assembly area",
        "Roll call performed by company security or safety and confirmed accurate",
        "Confirm transportation is available for all personnel & identify off-site evacuation center/route",
        "Contractor groups coordinate loading of their own vehicles",
        "Time permitting: one pillowcase of essentials (wallet, medication, etc.); clothing and nonessentials left behind"
      ]
    }
  ],

  evacuationRoutes: [
    {
      id: "green",
      name: "Green route — Highway 40 to Grande Prairie pipe yard",
      color: "#2ee66d",
      destination: "Grande Prairie pipe yard (check-in with Security)",
      radio: "Can4Main",
      steps: [
        "Travel North from the laydown yard on Canfor 2000 Rd to Highway 40 (Radio Channel: Can4Main)",
        "Travel North to Grande Prairie",
        "Turn right at the 1st set of lights",
        "Take the 1st turn to the left and check-in with Security at the GP Pipe yard",
        "After check-in, vehicle operators coordinate with their company for further direction"
      ]
    },
    {
      id: "yellow",
      name: "Yellow route — Highway 40 to Grande Cache Mall parking lot",
      color: "#f5a524",
      destination: "Grande Cache Mall parking lot (check-in with Security)",
      radio: "Can4Main",
      steps: [
        "Travel North from the laydown yard on Canfor 2000 Rd to Highway 40 (Radio Channel: Can4Main)",
        "Travel South to Grande Cache",
        "Turn right at the 2nd set of lights",
        "Turn right into mall parking lot, check-in with Security",
        "After check-in, vehicle operators coordinate with their company for further direction"
      ]
    },
    {
      id: "red",
      name: "Red route — Forestry Trunk Road Sec #732 to Hinton",
      color: "#ff4d4d",
      destination: "Holiday Inn Express parking lot, Hinton (check-in with Security)",
      radio: "Can4main then Lad 1/FTR",
      steps: [
        "Travel South on Canfor 2000 Rd to Forestry Trunk Road (FTR); radio channel: Can4main",
        "Turn right onto FTR, travel South to Hinton; radio channel: Lad 1/FTR",
        "Turn right and follow road; turn North at the 4-way stop and follow to Highway 16",
        "Turn right and travel approx. 3 km to Holiday Inn Express parking lot and check-in with Security",
        "After check-in, vehicle operators coordinate with their company for further direction"
      ]
    }
  ],

  offSiteCentres: [
    "Grande Prairie pipe yard (green route)",
    "Grande Cache Mall parking lot (yellow route)",
    "Holiday Inn Express parking lot, Hinton (red route)",
    "Tags collected at designated evacuation center in either Grande Prairie or Grande Cache"
  ],

  contacts: {
    emergencyReport: [
      { role: "Report a wildfire", detail: "Call 310-FIRE (3473)" }
    ],
    roles: [
      {
        role: "TCE Corporate Emergency Operations Center (CEOC)",
        duties: ["Provide corporate guidance and additional resources as required"]
      },
      {
        role: "Incident Commander — TCE Site Construction Manager (or designate)",
        duties: [
          "Give the evacuation order after communication with TCE corporate EOC, Prime Contractor Incident Commanders, and government agencies",
          "Communicate the route to be taken",
          "Determine if additional resources are required",
          "Hold a meeting with Incident Commanders to discuss/assign specific responsibilities as required"
        ]
      },
      {
        role: "Security Personnel",
        duties: [
          "Accurate record of all personnel leaving site",
          "Maintain site access control",
          "Record vehicle tags, occupants and times that vehicles leave site",
          "Search camp facility & other buildings to ensure all personnel are accounted for",
          "Dispatch an off-site evacuation center coordinator to record incoming vehicles",
          "Provide procedures/directions to all vehicles leaving site"
        ]
      },
      {
        role: "Medical Services Contractor",
        duties: [
          "Ensure MTCs are fuelled and equipment maintained ready",
          "Follow the convoy to the off-site evacuation centre",
          "Confirm satellite phone is operational, if equipped",
          "Medics available during evacuation; non-emergency injuries wait until final meeting location"
        ]
      },
      {
        role: "Site Safety Advisor",
        duties: [
          "Provide ICS Forms and ICS Responsibilities List",
          "Review and communicate the actions listed in the response chart",
          "Assist designated individuals in maintaining site safety & control"
        ]
      },
      {
        role: "Camp Group Prime — Camp Management",
        duties: [
          "Identify fuel and electrical sources; isolate as necessary",
          "Search camp facility; ensure all personnel accounted for",
          "Secure the camp building as required",
          "Assist orderly departure; check-in at off-site evacuation center as required"
        ]
      },
      {
        role: "Pipeline Prime — Management",
        duties: [
          "Ensure fuel sources (LPG, electrical, diesel/gas, high-pressure cylinders) are secured",
          "Identify heavy equipment in the yard & stage away from treeline and fuel sources",
          "Secure company trailers, c-cans, and other assets",
          "Assist orderly departure; check-in at off-site evacuation center as required"
        ]
      },
      {
        role: "Prime Contractors (evacuation seating)",
        duties: [
          "Ensure each worker and sub-contractor under their direction has a seat in a vehicle for evacuation"
        ]
      }
    ],
    /**
     * WILDFIRE RESPONSE CHART – Document all activity
     * Verbatim duties from site-specific-plan.docx (structured paras after chart heading).
     * Named people / phone numbers are blank in source — not invented here.
     * Role title "PUBLIC PROTECTION BRAND DIRECTOR" kept as in source text.
     */
    responseChartRoles: [
      {
        role: "SAFETY OFFICER",
        duties: [
          "Conduct/Update and maintain Fire Watch",
          "Assess/monitor safety hazards or unsafe conditions. Develop measures to ensure the safety of response personnel.",
        ]
      },
      {
        role: "PUBLIC INFORMATION OFFICER",
        duties: [
          "Provide timely information to the EOC Media, in consultation with the required government agencies.",
        ]
      },
      {
        role: "LIAISON OFFICER",
        duties: [
          "Maintain contact with required government agencies.",
          "Provide regular updates to the Incident Commander.",
          "Ensure required communication occurs between internal and external people.",
        ]
      },
      {
        role: "MUSTER CAPTAINS/MARSHALLS",
        duties: [
          "Coordinate and ensure evacuation of personnel, staff residences, camps, and contractors.",
          "Ensure evacuation routes are clear.",
          "Report to Evacuation Group Supervisor",
        ]
      },
      {
        role: "RECEPTION CENTRE GROUP SUPERVISOR",
        duties: [
          "Establish a reception centre for evacuees.",
          "Receive evacuees at the reception centre.",
          "Maintain records and report to Public Protection Branch Dir.",
        ]
      },
      {
        role: "OPERATIONS SECTION CHIEF",
        duties: [
          "Implement tactical objectives to maintain necessary operations. Direct wildfire mitigation efforts (i.e. asset protection)",
          "Liaison with Construction & Camp Ops Section Chiefs for staged shutdown",
          "Continue to assess and report to IC ongoing operating activities in order to minimize risk to personnel and equipment",
          "Direct safe shutdown procedures based on WHZ.",
          "Support Logistics Section Chief as necessary",
          "Assign Staging Area Manager to assist transportation requirement as required",
        ]
      },
      {
        role: "PUBLIC PROTECTION BRAND DIRECTOR",
        duties: [
          "Direct public safety related response activities.",
          "Assign Group Supervisors based on WHZ",
          "Establish Air Monitoring Crew, continue to monitor wind direction and quality",
          "Establish monitor egress routes",
          "Ensure evacuation of all persons based on WHZ strategy.",
          "Report to Operations Section Chief and/or Incident Commander",
        ]
      },
      {
        role: "INCIDENT COMMANDER",
        duties: [
          "Evaluate the situation and initiate ERP",
          "Establish the Incident Command Post (ICP). Assign Deputy IC as required",
          "Establish Status Board and designate Fire Watch to liaison with ERSD.",
          "Assign a Wildfire Hazard Zone (WHZ) radius, in consultation with the Operations Section Chief and ESRD Information.",
          "Assign roles and responsibilities to Officers and Section Chiefs",
          "Report to ECC – who will initiate Calgary EOC call-down and Corporate Emergency Response Plan",
          "Report Level of Emergency to the AER.",
          "Ensure backup or outside resources are on standby or enroute based on WHZ designation.",
          "Notify Prime Contractors, CMT, and begin evacuation procedures as required based on WHZ designation",
          "Continue to liaison with Calgary EOC and Incident Commanders",
        ]
      },
      {
        role: "OPERATIONS CONTROL UNIT",
        duties: [
          "Essential personnel to maintain various continued operations as safe to do so.",
        ]
      },
      {
        role: "SECURITY/ROADBLOCK SUPERVISOR",
        duties: [
          "Ensure appropriate roadblock/isolation equipment and manpower is in place.",
          "Maintain accurate Company head counts – report regularly to ICP",
          "Direct traffic during the evacuation /documenting exit.",
          "Direct evacuees to the appropriate Reception Centre",
        ]
      },
      {
        role: "LOGISTICS SECTION CHIEF",
        duties: [
          "Inventory transportation, sustenance, resources, fuel equipment. Establish communications strategy",
          "Coordinate with Public Protection Branch Director to establish evacuation schedule",
          "Establish a Reception Centre for secondary check in as required based on WHZ",
        ]
      },
      {
        role: "STAGING AREA MANAGER",
        duties: [
          "Provide traffic control support",
          "Coordinate transportation",
        ]
      },
    ],
    radioChannels: [
      { channel: "Can4Main / Can4main", use: "Canfor 2000 Rd / initial egress" },
      { channel: "Lad 1/FTR", use: "Forestry Trunk Road toward Hinton" }
    ],
    namedTeams: [
      "TCE — Construction Site Management (heading present; named individuals not in extractable text)",
      "Prime Contractor Management (heading present; named individuals not in extractable text)",
      "Incident Commanders referenced: TCE, Royal, SMJV"
    ],
    forestryFormFields: [
      "Forestry Field Center (blank in source form)",
      "Field Center Contact Name (blank)",
      "Field Center Contact Number (blank)",
      "Forestry Division Industry Liaison (blank)",
      "Forestry Industry Liaison Number (blank)"
    ]
  },

  airQuality: {
    note: "Visibility-based PM estimation for areas without continuous AQHI monitoring. Dry air conditions only. Face away from sun; use landmarks at known distances.",
    visibilityTable: [
      { visibilityKm: "15 km and up", category: "Good", pm25: "0–40" },
      { visibilityKm: "5 – 14 km", category: "Moderate/unhealthy for sensitive groups", pm25: "41–175" },
      { visibilityKm: "2.5 – 4 km", category: "Unhealthy", pm25: "176–300" },
      { visibilityKm: "1.5 – 2 km", category: "Very unhealthy", pm25: "301–500" },
      { visibilityKm: "Less than 1 km", category: "Hazardous", pm25: "Over 500" }
    ],
    responseActions: [
      {
        category: "Good",
        atRisk: "Continue with usual outdoor activities",
        others: "Ideal air quality for outdoor activities",
        actions: ["Be aware of forecast (current, daily, tomorrow)"]
      },
      {
        category: "Moderate/unhealthy for sensitive groups",
        atRisk: "Reduce or reschedule prolonged strenuous activities and limit time spent outdoors",
        others: "Be aware of health effects of smoke and related symptoms",
        actions: [
          "Advise workers about health effects of smoke, related symptoms and ways to reduce exposure",
          "If event may be prolonged, evaluate and notify possible cleaner air shelter sites and prepare evacuation plans for at-risk personnel"
        ]
      },
      {
        category: "Unhealthy",
        atRisk: "Avoid prolonged, strenuous activities and stay indoors if possible",
        others: "Reduce or reschedule prolonged strenuous activities outdoors, especially if you experience symptoms",
        actions: [
          "Consider cancelling non-essential outdoor activities",
          "Restrict or eliminate access to site by others",
          "Consider the distribution and use of respirators and masks"
        ]
      },
      {
        category: "Very unhealthy",
        atRisk: "Avoid all strenuous activities and stay indoors if possible",
        others: "Avoid prolonged strenuous activities and stay indoors if possible",
        actions: [
          "Consider having at-risk personnel go to designated shelter areas",
          "Make preparations and take precautions against wildfire threats",
          "Consider the distribution and use of respirators and masks"
        ]
      },
      {
        category: "Hazardous",
        atRisk: "Avoid all strenuous activities and stay indoors",
        others: "Avoid all strenuous activities and stay indoors",
        actions: [
          "Restrict activities to the essentials",
          "Consider evacuation of at-risk or all personnel",
          "Make preparations and take precautions against wildfire threats",
          "Consider the distribution and use of respirators and masks"
        ]
      }
    ],
    carbonMonoxide: {
      note: "CO is generally less of a threat than particulates during a wildfire but can be serious when sheltering in enclosed spaces. Colorless, odorless, tasteless — use a carbon monoxide detector. Recommended actions table referenced in the plan was not present as extractable text (possible image-only)."
    }
  },

  resourceList: [
    "Loud Hailer for crowd communications",
    "ICS Status Board",
    "Wall Map of Area",
    "Resource Kits for ICS roles: ICS forms, Position responsibilities",
    "Laminated ICS Wall Chart x 3 with water markers",
    "20' high x 36\" dia. Windsock installed in the middle of the laydown",
    "Vehicle Tags c/w evac routes (2 sided)"
  ],

  gaps: [
    "Response Team Designations: named people/phones blank; role duty text exists (see Contacts → Response chart roles, and designation headings TBD/blank).",
    "WILDFIRE RESPONSE CHART: named people/phones blank; role duty text exists and is surfaced under Contacts (verbatim from docx).",
    "Forestry Field Center / Industry Liaison contact fields in the reporting form are blank in the source.",
    "TCE Emergency Control Centre / Calgary EOC phone numbers are referenced (post/initiate) but not listed as numbers in extractable text.",
    "Laydown yard plot plan note in source: \"needs stars site, muster areas added\" — no coordinates or map pins in the document text.",
    "Alternate meeting points: \"to be determined by the incident commanders.\"",
    "Carbon monoxide recommended-actions table referenced but not extractable as text.",
    "Exact camp/site lat-lon for Karr/DVN not stated in the plan; app keeps a TEST placeholder pin just outside Hinton, AB (53.42, −117.50) until a real LodgeX camp coordinate is supplied. Real camp coords remain a gap.",
    "PowerPoint deck is mostly Alberta/DVN wildfire statistics context; it does not add operational actions, contacts, routes, or distance triggers beyond reinforcing ~150 km landscape context."
  ]
};

/**
 * Compute active WHZ level from nearest fire distance (km).
 * @param {number|null} nearestKm - distance to nearest active fire, or null if none in range
 * @param {number} monitorRadiusKm - app monitoring radius (default 150)
 * @returns {{ level: object|null, reason: string, nearestKm: number|null }}
 */
window.computeWhzLevel = function (nearestKm, monitorRadiusKm) {
  const plan = window.WILDFIRE_PLAN;
  const radius = monitorRadiusKm == null ? 150 : monitorRadiusKm;
  if (nearestKm == null || !Number.isFinite(nearestKm)) {
    return {
      level: null,
      reason: "No active wildfire within " + radius + " km — WHZ chart not triggered by distance. Maintain normal Fire Watch per site practice.",
      nearestKm: null
    };
  }
  // Severity order: Level 3 (<=25), Level 2 (>25–50), Level 1 (>50–100), Alert (>100–monitor radius)
  const levels = plan.whzLevels;
  let match = null;
  if (nearestKm <= 25) match = levels.find((l) => l.id === "level3");
  else if (nearestKm <= 50) match = levels.find((l) => l.id === "level2");
  else if (nearestKm <= 100) match = levels.find((l) => l.id === "level1");
  else if (nearestKm <= radius) match = levels.find((l) => l.id === "alert");
  else {
    return {
      level: null,
      reason: "Nearest fire is beyond " + radius + " km monitor radius.",
      nearestKm
    };
  }
  return {
    level: match,
    reason: "Nearest active fire at " + nearestKm.toFixed(1) + " km → " + match.name + " (" + match.rangeLabel + ")",
    nearestKm
  };
};
