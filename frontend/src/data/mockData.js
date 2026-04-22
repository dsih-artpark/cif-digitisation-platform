export const extractedCaseData = {
  patientName: "Jagdesh Mishra",
  age: "50",
  date: "17-10-2022",
  symptoms: "Fever",
  diagnosis: "Acute viral illness",
  medicines:
    "Paracetamol 650 mg - 1 tablet twice daily for 3 days\nPantoprazole 40 mg - 1 tablet before food\nMultivitamin - 1 tablet after food",
};

export const extractedStatus = {
  patientName: "Verified",
  age: "System Extracted",
  date: "Review Required",
  symptoms: "System Extracted",
  diagnosis: "Verified",
  medicines: "Review Required",
};

export const summaryStats = [
  { title: "Total Cases", value: 2456 },
  { title: "Follow-up Cases", value: 421 },
  { title: "New Cases This Week", value: 148 },
  { title: "Verified Records", value: 2198 },
];

export const weeklyCaseTrend = [
  { week: "Week 1", cases: 110 },
  { week: "Week 2", cases: 124 },
  { week: "Week 3", cases: 98 },
  { week: "Week 4", cases: 132 },
  { week: "Week 5", cases: 145 },
  { week: "Week 6", cases: 138 },
  { week: "Week 7", cases: 160 },
];

export const statusBreakdown = [
  { status: "Verified", value: 72 },
  { status: "Review Required", value: 18 },
  { status: "System Extracted", value: 10 },
];

export const casesByState = [
  { state: "Maharashtra", cases: 430 },
  { state: "Uttar Pradesh", cases: 512 },
  { state: "Tamil Nadu", cases: 301 },
  { state: "Karnataka", cases: 288 },
  { state: "West Bengal", cases: 245 },
  { state: "Rajasthan", cases: 215 },
];

export const gadchiroliTalukaCases = [
  { taluka: "Gadchiroli", cases: 44 },
  { taluka: "Armori", cases: 36 },
  { taluka: "Kurkheda", cases: 31 },
  { taluka: "Dhanora", cases: 28 },
  { taluka: "Chamorshi", cases: 39 },
  { taluka: "Sironcha", cases: 24 },
  { taluka: "Desaiganj (Vadasa)", cases: 33 },
  { taluka: "Korchi", cases: 22 },
  { taluka: "Bhamragad", cases: 18 },
  { taluka: "Mulchera", cases: 27 },
  { taluka: "Aheri", cases: 41 },
  { taluka: "Etapalli", cases: 20 },
];

export const regionalTrend = [
  { week: "Week 1", north: 30, south: 25, east: 20, west: 22 },
  { week: "Week 2", north: 32, south: 27, east: 21, west: 25 },
  { week: "Week 3", north: 28, south: 26, east: 24, west: 23 },
  { week: "Week 4", north: 36, south: 29, east: 26, west: 28 },
  { week: "Week 5", north: 38, south: 31, east: 28, west: 30 },
];

export const stateMapDetails = {
  Gadchiroli: { cases: 430, trend: "+8% vs last week" },
  Maharashtra: { cases: 430, trend: "+8% vs last week" },
  "Uttar Pradesh": { cases: 512, trend: "+6% vs last week" },
  "Tamil Nadu": { cases: 301, trend: "+4% vs last week" },
  Karnataka: { cases: 288, trend: "+5% vs last week" },
  "West Bengal": { cases: 245, trend: "+3% vs last week" },
  Rajasthan: { cases: 215, trend: "+2% vs last week" },
  Gujarat: { cases: 198, trend: "+4% vs last week" },
  Kerala: { cases: 174, trend: "+3% vs last week" },
  Delhi: { cases: 126, trend: "+2% vs last week" },
  Bihar: { cases: 206, trend: "+5% vs last week" },
};

const stateModelConfig = {
  Gadchiroli: { growth: 8, urbanShare: 0.34, verifiedRate: 0.91, followUpRate: 0.18, newCaseRate: 0.07 },
  Maharashtra: { growth: 8, urbanShare: 0.71, verifiedRate: 0.91, followUpRate: 0.18, newCaseRate: 0.07 },
  "Uttar Pradesh": {
    growth: 6,
    urbanShare: 0.44,
    verifiedRate: 0.86,
    followUpRate: 0.2,
    newCaseRate: 0.08,
  },
  "Tamil Nadu": { growth: 4, urbanShare: 0.63, verifiedRate: 0.9, followUpRate: 0.17, newCaseRate: 0.06 },
  Karnataka: { growth: 5, urbanShare: 0.66, verifiedRate: 0.89, followUpRate: 0.16, newCaseRate: 0.07 },
  "West Bengal": {
    growth: 3,
    urbanShare: 0.48,
    verifiedRate: 0.87,
    followUpRate: 0.19,
    newCaseRate: 0.06,
  },
  Rajasthan: { growth: 2, urbanShare: 0.39, verifiedRate: 0.85, followUpRate: 0.21, newCaseRate: 0.05 },
  Gujarat: { growth: 4, urbanShare: 0.58, verifiedRate: 0.88, followUpRate: 0.18, newCaseRate: 0.06 },
  Kerala: { growth: 3, urbanShare: 0.55, verifiedRate: 0.93, followUpRate: 0.14, newCaseRate: 0.05 },
  Delhi: { growth: 2, urbanShare: 0.96, verifiedRate: 0.94, followUpRate: 0.12, newCaseRate: 0.05 },
  Bihar: { growth: 5, urbanShare: 0.31, verifiedRate: 0.82, followUpRate: 0.22, newCaseRate: 0.08 },
};

function createWeeklyTrend(totalCases, growth) {
  const baseline = Math.max(18, Math.round(totalCases / 7.2));
  const multipliers = [0.83, 0.87, 0.92, 0.97, 1.0, 1.04, 1.08];
  return multipliers.map((multiplier, index) => {
    const growthFactor = 1 + growth / 100;
    return {
      week: `Week ${index + 1}`,
      cases: Math.round(baseline * multiplier * growthFactor),
    };
  });
}

function createStatusSplit(verifiedRate) {
  const verified = Math.round(verifiedRate * 100);
  const review = Math.round((1 - verifiedRate) * 65);
  const system = 100 - verified - review;
  return [
    { status: "Verified", value: verified },
    { status: "Review Required", value: review },
    { status: "System Extracted", value: system },
  ];
}

function createSegments(totalCases, urbanShare) {
  const urbanCases = Math.round(totalCases * urbanShare);
  const ruralCases = totalCases - urbanCases;
  return [
    { label: "Hospital Cases", value: Math.round(totalCases * 0.62) },
    { label: "PHC Cases", value: Math.round(totalCases * 0.38) },
    { label: "Urban Cases", value: urbanCases },
    { label: "Rural Cases", value: ruralCases },
    { label: "Fever Cases", value: Math.round(totalCases * 0.42) },
    { label: "Respiratory Cases", value: Math.round(totalCases * 0.26) },
  ];
}

export const stateProfiles = Object.entries(stateMapDetails).reduce((accumulator, [stateName, mapDetails]) => {
  const config = stateModelConfig[stateName] || {
    growth: 3,
    urbanShare: 0.5,
    verifiedRate: 0.85,
    followUpRate: 0.18,
    newCaseRate: 0.06,
  };
  const totalCases = mapDetails.cases;
  accumulator[stateName] = {
    trendLabel: mapDetails.trend,
    totalCases,
    followUpCases: Math.round(totalCases * config.followUpRate),
    newCasesThisWeek: Math.round(totalCases * config.newCaseRate),
    verifiedRecords: Math.round(totalCases * config.verifiedRate),
    weeklyTrend: createWeeklyTrend(totalCases, config.growth),
    statusBreakdown: createStatusSplit(config.verifiedRate),
    segments: createSegments(totalCases, config.urbanShare),
  };
  return accumulator;
}, {});

export const stateNameOptions = Object.keys(stateProfiles);

export const nationalSegments = [
  { label: "Hospital Cases", value: 1522 },
  { label: "PHC Cases", value: 934 },
  { label: "Urban Cases", value: 1396 },
  { label: "Rural Cases", value: 1060 },
  { label: "Fever Cases", value: 982 },
  { label: "Respiratory Cases", value: 614 },
];
