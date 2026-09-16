import { createRng } from "@/lib/random";
import type { CategoryId, RegionId, Vendor, VerificationStatus } from "@/types";
import { REGION_BY_ID } from "./reference";

/** Ids used by the authored storyline. */
export const V = {
  vertex: "V-1042",
  northstar: "V-1057",
  apex: "V-1063",
  bluegrid: "V-1071",
  sahyadri: "V-1088",
  ghatroad: "V-1097",
  deccan: "V-1093",
  ironwood: "V-1102",
  graniteline: "V-1118",
  urbanarc: "V-1124",
  karavali: "V-1131",
  stratum: "V-1146",
  terracebeam: "V-1152",
  monsoonline: "V-1167",
  tunga: "V-1173",
  riverbend: "V-1189",
  meridian: "V-2014",
  kestrel: "V-2021",
  tidewater: "V-2036",
  carewell: "V-2043",
  lifeline: "V-2058",
  sunrise: "V-2062",
  aurora: "V-2077",
  quillon: "V-3011",
  datastream: "V-3025",
  nimbus: "V-3032",
  cobalt: "V-3047",
  corvid: "V-4018",
  roadrunner: "V-4026",
  silverline: "V-4031",
  harrow: "V-5012",
  greenfurrow: "V-5027",
  kisandrip: "V-5033",
  rainfed: "V-5041",
  lumen: "V-6015",
  brightdesk: "V-6022",
  chalkslate: "V-6034",
  scholarly: "V-6048",
  hearth: "V-6053",
  pantry: "V-6061",
} as const;

/** Addresses that more than one vendor points at — the basis of address signals. */
export const ADDRESSES = {
  seabreeze: {
    id: "ADDR-0091",
    label: "Unit 3B, Seabreeze Trade Center, Coastal Ring Road, Mangaluru 575003",
  },
  baad12: { id: "ADDR-0148", label: "Plot 12, Baad Industrial Estate, Karwar 581301" },
  baad12a: { id: "ADDR-0149", label: "Plot 12-A, Baad Industrial Estate, Karwar 581301" },
  elevenCommons: {
    id: "ADDR-0377",
    label: "Eleven Commons Workspace, 4th Floor, Koramangala 6th Block, Bengaluru 560095",
  },
} as const;

interface NamedVendorSeed {
  id: string;
  name: string;
  legalForm: string;
  registeredOn: string;
  verification: VerificationStatus;
  regionId: RegionId;
  city: string;
  address: string;
  categories: CategoryId[];
  directors: string[];
  classLabel: string;
}

const NAMED: NamedVendorSeed[] = [
  {
    id: V.vertex,
    name: "Vertex Infra Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2016-06-14",
    verification: "REGISTERED",
    regionId: "coastal",
    city: "Mangaluru",
    address: ADDRESSES.seabreeze.label,
    categories: ["road", "building"],
    directors: ["R. Varadan", "S. Mallya"],
    classLabel: "Class I civil contractor",
  },
  {
    id: V.northstar,
    name: "Northstar Roads Ltd",
    legalForm: "Public Limited",
    registeredOn: "2014-02-03",
    verification: "REGISTERED",
    regionId: "coastal",
    city: "Mangaluru",
    address: ADDRESSES.seabreeze.label,
    categories: ["road"],
    directors: ["K. Pai", "N. Prabhu"],
    classLabel: "Class I civil contractor",
  },
  {
    id: V.apex,
    name: "Apex Civilworks",
    legalForm: "Partnership",
    registeredOn: "2017-09-21",
    verification: "REGISTERED",
    regionId: "coastal",
    city: "Udupi",
    address: "No. 14, Ananth Arcade, Brahmagiri, Udupi 576101",
    categories: ["road", "building"],
    directors: ["S. Hegde", "A. Shenoy"],
    classLabel: "Class I civil contractor",
  },
  {
    id: V.bluegrid,
    name: "BlueGrid Infrastructure Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2018-01-11",
    verification: "REGISTERED",
    regionId: "coastal",
    city: "Karwar",
    address: ADDRESSES.baad12.label,
    categories: ["road", "water"],
    directors: ["S. Hegde", "T. Gowda"],
    classLabel: "Class I civil contractor",
  },
  {
    id: V.karavali,
    name: "Karavali Civil Constructions",
    legalForm: "Partnership",
    registeredOn: "2012-11-08",
    verification: "VERIFIED",
    regionId: "coastal",
    city: "Kundapura",
    address: "Door 44/2, Kotathattu Road, Kundapura 576201",
    categories: ["road", "building"],
    directors: ["J. Fernandes"],
    classLabel: "Class I civil contractor",
  },
  {
    id: V.sahyadri,
    name: "Sahyadri Roadcraft Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2015-04-27",
    verification: "REGISTERED",
    regionId: "malnad",
    city: "Shivamogga",
    address: "Survey 118/3, Vinoba Nagar, Shivamogga 577204",
    categories: ["road"],
    directors: ["B. Naik"],
    classLabel: "Class I civil contractor",
  },
  {
    id: V.ghatroad,
    name: "Ghat Road Builders",
    legalForm: "Partnership",
    registeredOn: "2013-07-19",
    verification: "REGISTERED",
    regionId: "malnad",
    city: "Chikkamagaluru",
    address: "No. 9, Indavara Road, Chikkamagaluru 577101",
    categories: ["road"],
    directors: ["M. Alva"],
    classLabel: "Class II civil contractor",
  },
  {
    id: V.deccan,
    name: "Deccan Pavements Ltd",
    legalForm: "Public Limited",
    registeredOn: "2009-03-30",
    verification: "VERIFIED",
    regionId: "kalyana",
    city: "Kalaburagi",
    address: "Plot 61, Industrial Area, Kalaburagi 585102",
    categories: ["road", "building"],
    directors: ["G. Bhandary", "P. Kulkarni"],
    classLabel: "Class I civil contractor",
  },
  {
    id: V.ironwood,
    name: "Ironwood Highways LLP",
    legalForm: "LLP",
    registeredOn: "2016-12-02",
    verification: "REGISTERED",
    regionId: "mysuru",
    city: "Mysuru",
    address: "No. 221, Hebbal Industrial Area, Mysuru 570016",
    categories: ["road"],
    directors: ["V. Kamath"],
    classLabel: "Class I civil contractor",
  },
  {
    id: V.graniteline,
    name: "Granite Line Infra",
    legalForm: "Partnership",
    registeredOn: "2011-08-16",
    verification: "REGISTERED",
    regionId: "kittur",
    city: "Dharwad",
    address: "Plot 7, Belur Industrial Area, Dharwad 580011",
    categories: ["road", "building"],
    directors: ["H. Desai"],
    classLabel: "Class I civil contractor",
  },
  {
    id: V.urbanarc,
    name: "Urban Arc Surfaces Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2019-05-09",
    verification: "REGISTERED",
    regionId: "bengaluru",
    city: "Bengaluru Urban",
    address: "No. 58, Peenya 2nd Stage, Bengaluru 560058",
    categories: ["road"],
    directors: ["D. Rangan", "L. Dsouza"],
    classLabel: "Class I civil contractor",
  },
  {
    id: V.stratum,
    name: "Stratum Buildcon Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2017-02-14",
    verification: "REGISTERED",
    regionId: "kalyana",
    city: "Ballari",
    address: "No. 31, Cowl Bazaar, Ballari 583101",
    categories: ["building", "road"],
    directors: ["P. Ramanna", "C. Hiremath"],
    classLabel: "Class II civil contractor",
  },
  {
    id: V.terracebeam,
    name: "Terrace & Beam Builders",
    legalForm: "Partnership",
    registeredOn: "2018-10-05",
    verification: "PENDING_RENEWAL",
    regionId: "bengaluru",
    city: "Bengaluru Rural",
    address: "Site 12, Nelamangala Town, Bengaluru Rural 562123",
    categories: ["building"],
    directors: ["C. Hiremath"],
    classLabel: "Class II civil contractor",
  },
  {
    id: V.monsoonline,
    name: "Monsoon Line Engineering",
    legalForm: "Partnership",
    registeredOn: "2015-09-23",
    verification: "REGISTERED",
    regionId: "coastal",
    city: "Karwar",
    address: ADDRESSES.baad12a.label,
    categories: ["water", "building"],
    directors: ["R. Kotian"],
    classLabel: "Class II civil contractor",
  },
  {
    id: V.tunga,
    name: "Tunga Hydro Works Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2013-01-29",
    verification: "REGISTERED",
    regionId: "malnad",
    city: "Shivamogga",
    address: "No. 76, Gopi Circle, Shivamogga 577201",
    categories: ["water"],
    directors: ["A. Sequeira", "N. Gowda"],
    classLabel: "Class I civil contractor",
  },
  {
    id: V.riverbend,
    name: "Riverbend Pipes & Fittings",
    legalForm: "Private Limited",
    registeredOn: "2016-03-17",
    verification: "REGISTERED",
    regionId: "mysuru",
    city: "Mandya",
    address: "Shed 4, KIADB Estate, Mandya 571401",
    categories: ["water"],
    directors: ["N. Gowda"],
    classLabel: "Registered supplier",
  },
  {
    id: V.meridian,
    name: "Meridian Medisupply Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2015-07-06",
    verification: "REGISTERED",
    regionId: "bengaluru",
    city: "Bengaluru Urban",
    address: "No. 402, Richmond Circle, Bengaluru 560025",
    categories: ["medsup", "medeq"],
    directors: ["S. Anand", "R. Ahmed"],
    classLabel: "Registered medical supplier",
  },
  {
    id: V.kestrel,
    name: "Kestrel Diagnostics LLP",
    legalForm: "LLP",
    registeredOn: "2018-04-12",
    verification: "REGISTERED",
    regionId: "bengaluru",
    city: "Bengaluru Urban",
    address: ADDRESSES.elevenCommons.label,
    categories: ["medsup"],
    directors: ["T. Menon"],
    classLabel: "Registered medical supplier",
  },
  {
    id: V.tidewater,
    name: "Tidewater Pharma Logistics",
    legalForm: "Private Limited",
    registeredOn: "2014-10-21",
    verification: "VERIFIED",
    regionId: "coastal",
    city: "Mangaluru",
    address: "Warehouse 6, Baikampady Industrial Area, Mangaluru 575011",
    categories: ["medsup"],
    directors: ["F. Dsilva"],
    classLabel: "Registered medical supplier",
  },
  {
    id: V.carewell,
    name: "Carewell Surgicals",
    legalForm: "Proprietorship",
    registeredOn: "2017-11-30",
    verification: "REGISTERED",
    regionId: "mysuru",
    city: "Mysuru",
    address: "No. 18, Sayyaji Rao Road, Mysuru 570001",
    categories: ["medsup"],
    directors: ["R. Ahmed"],
    classLabel: "Registered medical supplier",
  },
  {
    id: V.lifeline,
    name: "Lifeline Biomedical Systems Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2012-08-08",
    verification: "VERIFIED",
    regionId: "bengaluru",
    city: "Bengaluru Urban",
    address: "No. 9, Millers Road, Bengaluru 560052",
    categories: ["medeq"],
    directors: ["K. Srinath"],
    classLabel: "Registered equipment supplier",
  },
  {
    id: V.sunrise,
    name: "Sunrise Healthcare Distributors",
    legalForm: "Partnership",
    registeredOn: "2016-01-25",
    verification: "REGISTERED",
    regionId: "kittur",
    city: "Belagavi",
    address: "No. 61, Khanapur Road, Belagavi 590006",
    categories: ["medsup"],
    directors: ["S. Patil"],
    classLabel: "Registered medical supplier",
  },
  {
    id: V.aurora,
    name: "Aurora Medtech Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2020-02-19",
    verification: "REGISTERED",
    regionId: "bengaluru",
    city: "Bengaluru Urban",
    address: ADDRESSES.elevenCommons.label,
    categories: ["medeq"],
    directors: ["V. Raghunath"],
    classLabel: "Registered equipment supplier",
  },
  {
    id: V.quillon,
    name: "Quillon IT Systems Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2016-09-15",
    verification: "REGISTERED",
    regionId: "bengaluru",
    city: "Bengaluru Urban",
    address: "Tower B, Whitefield Tech Park, Bengaluru 560066",
    categories: ["it"],
    directors: ["A. Bhat", "S. Nanda"],
    classLabel: "Empanelled IT vendor",
  },
  {
    id: V.datastream,
    name: "Datastream Govtech Solutions Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2017-06-28",
    verification: "REGISTERED",
    regionId: "bengaluru",
    city: "Bengaluru Urban",
    address: "No. 27, Domlur 2nd Stage, Bengaluru 560071",
    categories: ["it"],
    directors: ["S. Nanda"],
    classLabel: "Empanelled IT vendor",
  },
  {
    id: V.nimbus,
    name: "Nimbus Civic Software LLP",
    legalForm: "LLP",
    registeredOn: "2019-11-04",
    verification: "REGISTERED",
    regionId: "mysuru",
    city: "Mysuru",
    address: "No. 3, Kalidasa Road, Mysuru 570002",
    categories: ["it"],
    directors: ["G. Prasad"],
    classLabel: "Empanelled IT vendor",
  },
  {
    id: V.cobalt,
    name: "Cobalt Networks India Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2013-12-12",
    verification: "VERIFIED",
    regionId: "bengaluru",
    city: "Bengaluru Urban",
    address: "No. 88, Electronic City Phase 1, Bengaluru 560100",
    categories: ["it"],
    directors: ["M. Fernandes"],
    classLabel: "Empanelled IT vendor",
  },
  {
    id: V.corvid,
    name: "Corvid Fleet Services Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2015-02-11",
    verification: "REGISTERED",
    regionId: "bengaluru",
    city: "Bengaluru Urban",
    address: "Yard 3, Yeshwanthpur Industrial Suburb, Bengaluru 560022",
    categories: ["transport"],
    directors: ["H. Kulkarni"],
    classLabel: "Registered service provider",
  },
  {
    id: V.roadrunner,
    name: "Roadrunner Fleet Care",
    legalForm: "Proprietorship",
    registeredOn: "2019-07-23",
    verification: "REGISTERED",
    regionId: "mysuru",
    city: "Mysuru",
    address: "Shed 12, Bannimantap, Mysuru 570015",
    categories: ["transport"],
    directors: ["P. Suresh"],
    classLabel: "Registered service provider",
  },
  {
    id: V.silverline,
    name: "Silverline Transit Solutions Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2017-04-06",
    verification: "REGISTERED",
    regionId: "kittur",
    city: "Hubballi",
    address: "No. 12, Gokul Road, Hubballi 580030",
    categories: ["transport", "it"],
    directors: ["N. Joshi"],
    classLabel: "Registered service provider",
  },
  {
    id: V.harrow,
    name: "Harrow Agritech Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2016-08-19",
    verification: "REGISTERED",
    regionId: "kalyana",
    city: "Raichur",
    address: "No. 4, Station Road, Raichur 584101",
    categories: ["agri"],
    directors: ["P. Ramanna"],
    classLabel: "Registered agri supplier",
  },
  {
    id: V.greenfurrow,
    name: "Greenfurrow Agro Inputs",
    legalForm: "Partnership",
    registeredOn: "2015-06-10",
    verification: "REGISTERED",
    regionId: "malnad",
    city: "Hassan",
    address: "No. 22, B M Road, Hassan 573201",
    categories: ["agri"],
    directors: ["S. Chandru"],
    classLabel: "Registered agri supplier",
  },
  {
    id: V.kisandrip,
    name: "Kisan Drip Systems Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2014-05-05",
    verification: "REGISTERED",
    regionId: "kittur",
    city: "Bagalkot",
    address: "Plot 19, Navanagar, Bagalkot 587103",
    categories: ["agri", "water"],
    directors: ["U. Metri"],
    classLabel: "Registered agri supplier",
  },
  {
    id: V.rainfed,
    name: "Rainfed Seeds & Implements",
    legalForm: "Proprietorship",
    registeredOn: "2018-03-14",
    verification: "PENDING_RENEWAL",
    regionId: "kalyana",
    city: "Bidar",
    address: "No. 7, Basaveshwara Circle, Bidar 585401",
    categories: ["agri"],
    directors: ["K. Biradar"],
    classLabel: "Registered agri supplier",
  },
  {
    id: V.lumen,
    name: "Lumen EduSupply Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2017-12-01",
    verification: "REGISTERED",
    regionId: "bengaluru",
    city: "Bengaluru Urban",
    address: "No. 34, Jayanagar 4th Block, Bengaluru 560011",
    categories: ["edumat"],
    directors: ["A. Nadig"],
    classLabel: "Registered supplier",
  },
  {
    id: V.brightdesk,
    name: "Brightdesk Furniture Works",
    legalForm: "Partnership",
    registeredOn: "2018-09-26",
    verification: "REGISTERED",
    regionId: "mysuru",
    city: "Nanjangud",
    address: "Shed 8, Nanjangud Industrial Area, Mysuru 571302",
    categories: ["edumat"],
    directors: ["A. Nadig", "R. Byrappa"],
    classLabel: "Registered supplier",
  },
  {
    id: V.chalkslate,
    name: "Chalk & Slate Learning Aids",
    legalForm: "Proprietorship",
    registeredOn: "2016-11-17",
    verification: "REGISTERED",
    regionId: "kittur",
    city: "Vijayapura",
    address: "No. 51, Station Road, Vijayapura 586101",
    categories: ["edumat"],
    directors: ["S. Kadam"],
    classLabel: "Registered supplier",
  },
  {
    id: V.scholarly,
    name: "Scholarly Print House",
    legalForm: "Partnership",
    registeredOn: "2012-02-24",
    verification: "VERIFIED",
    regionId: "coastal",
    city: "Udupi",
    address: "No. 3, Car Street, Udupi 576101",
    categories: ["edumat"],
    directors: ["M. Baliga"],
    classLabel: "Registered supplier",
  },
  {
    id: V.hearth,
    name: "Hearth Institutional Kitchens Pvt Ltd",
    legalForm: "Private Limited",
    registeredOn: "2019-01-08",
    verification: "REGISTERED",
    regionId: "malnad",
    city: "Hassan",
    address: "No. 16, Salagame Road, Hassan 573201",
    categories: ["edumat"],
    directors: ["V. Poojary"],
    classLabel: "Registered supplier",
  },
  {
    id: V.pantry,
    name: "Pantry Steel Fabricators",
    legalForm: "Partnership",
    registeredOn: "2018-06-13",
    verification: "REGISTERED",
    regionId: "malnad",
    city: "Shivamogga",
    address: "Shed 21, Machenahalli Industrial Area, Shivamogga 577222",
    categories: ["edumat"],
    directors: ["V. Poojary", "L. Shivanna"],
    classLabel: "Registered supplier",
  },
];

/* ------------------------------------------------------------------ */
/* Generated registry — the long tail of registered vendors            */
/* ------------------------------------------------------------------ */

const NAME_PREFIX = [
  "Sahyadri", "Kaveri", "Tunga", "Bhadra", "Netravati", "Sharavati", "Hemavati", "Malaprabha",
  "Ghataprabha", "Varada", "Arkavati", "Karavali", "Malnad", "Kodagu", "Chalukya", "Hoysala",
  "Kadamba", "Nandi", "Chamundi", "Kudremukh", "Agumbe", "Jog", "Badami", "Aihole", "Gokarna",
  "Sirsi", "Dandeli", "Brightline", "Keystone", "Northgate", "Evergreen", "Summit", "Pinnacle",
  "Horizon", "Crescent", "Zenith", "Prism", "Vector", "Axis", "Orbit", "Lattice", "Anchor",
  "Beacon", "Cedar", "Coral", "Harbour", "Ivory", "Jade", "Lotus", "Marble", "Pearl", "Quartz",
  "Sable", "Topaz", "Willow", "Amber", "Trellis", "Foundry", "Compass", "Meridian Park",
];

const CORES: Record<string, string[]> = {
  civil: [
    "Constructions", "Infra Projects", "Buildcon", "Civil Works", "Engineers", "Roadways",
    "Builders", "Earthmovers", "Infratech", "Contractors", "Structures",
  ],
  water: ["Hydro Works", "Pipelines", "Water Solutions", "Borewells", "Drainage Systems"],
  medical: [
    "Medicals", "Pharma Distributors", "Surgicals", "Healthcare", "Life Sciences", "Diagnostics",
    "Meditech", "Biomedical",
  ],
  it: ["Infotech", "Software", "Technologies", "Systems", "Digital Services", "Data Systems", "Networks"],
  transport: ["Logistics", "Fleet Services", "Motors", "Transport Services", "Mobility"],
  agri: ["Agro Services", "Agritech", "Seeds", "Farm Inputs", "Irrigation", "Agro Industries"],
  edu: ["Educational Aids", "Stationers", "Furniture Works", "Printers & Publishers", "Learning Systems"],
};

const CORE_FOR_CATEGORY: Record<CategoryId, keyof typeof CORES> = {
  road: "civil",
  building: "civil",
  water: "water",
  medsup: "medical",
  medeq: "medical",
  it: "it",
  transport: "transport",
  agri: "agri",
  edumat: "edu",
};

const SUFFIX: [string, number][] = [
  ["Pvt Ltd", 46],
  ["", 26],
  ["LLP", 14],
  ["& Co.", 8],
  ["Ltd", 6],
];

const LEGAL_FORM: Record<string, string> = {
  "Pvt Ltd": "Private Limited",
  Ltd: "Public Limited",
  LLP: "LLP",
  "& Co.": "Partnership",
  "": "Proprietorship",
};

const SURNAMES = [
  "Rao", "Shenoy", "Pai", "Kamath", "Hegde", "Gowda", "Naik", "Alva", "Bhandary", "Kotian",
  "Prabhu", "Nayak", "Acharya", "Bhat", "Kulkarni", "Desai", "Patil", "Hiremath", "Joshi",
  "Biradar", "Metri", "Kadam", "Poojary", "Baliga", "Sequeira", "Fernandes", "Dsouza", "Menon",
  "Iyer", "Srinath", "Raghunath", "Chandru", "Nadig", "Byrappa", "Shivanna", "Ramanna",
];

const INITIALS = "ABDGHJKLMNPRSTUV".split("");

const CATEGORY_WEIGHTS: [CategoryId, number][] = [
  ["road", 17],
  ["building", 15],
  ["water", 9],
  ["medsup", 13],
  ["medeq", 7],
  ["it", 10],
  ["transport", 8],
  ["agri", 10],
  ["edumat", 11],
];

const REGION_WEIGHTS: [RegionId, number][] = [
  ["bengaluru", 26],
  ["coastal", 15],
  ["malnad", 13],
  ["mysuru", 15],
  ["kalyana", 15],
  ["kittur", 16],
];

const TOTAL_VENDORS = 1284;

function buildVendors(): Vendor[] {
  const rng = createRng(20260915);
  const vendors: Vendor[] = NAMED.map((seed) => ({
    ...seed,
    primaryCategory: seed.categories[0],
    registrationNo: registrationNumber(seed.id, seed.registeredOn, seed.legalForm),
    gstin: gstin(seed.name, seed.id),
    named: true,
  }));

  const used = new Set(vendors.map((v) => v.name.toLowerCase()));
  let serial = 10000;

  while (vendors.length < TOTAL_VENDORS) {
    const primaryCategory = rng.weighted(CATEGORY_WEIGHTS);
    const regionId = rng.weighted(REGION_WEIGHTS);
    const region = REGION_BY_ID[regionId];
    const core = rng.pick(CORES[CORE_FOR_CATEGORY[primaryCategory]]);
    const suffix = rng.weighted(SUFFIX);
    const name = [rng.pick(NAME_PREFIX), core, suffix].filter(Boolean).join(" ");
    if (used.has(name.toLowerCase())) continue;
    used.add(name.toLowerCase());

    serial += rng.int(3, 21);
    const id = `V-${serial}`;
    const registeredOn = `${rng.int(2008, 2024)}-${String(rng.int(1, 12)).padStart(2, "0")}-${String(
      rng.int(1, 28),
    ).padStart(2, "0")}`;
    const categories: CategoryId[] = [primaryCategory];
    if (rng.chance(0.22)) {
      const second = rng.weighted(CATEGORY_WEIGHTS);
      if (second !== primaryCategory) categories.push(second);
    }
    const legalForm = LEGAL_FORM[suffix];
    const directorCount = suffix === "" ? 1 : rng.int(1, 2);
    const directors = Array.from({ length: directorCount }, () => `${rng.pick(INITIALS)}. ${rng.pick(SURNAMES)}`);

    vendors.push({
      id,
      name,
      legalForm,
      registrationNo: registrationNumber(id, registeredOn, legalForm),
      gstin: gstin(name, id),
      registeredOn,
      verification: rng.weighted<VerificationStatus>([
        ["REGISTERED", 74],
        ["VERIFIED", 18],
        ["PENDING_RENEWAL", 8],
      ]),
      regionId,
      city: rng.pick(region.towns),
      address: `${rng.int(2, 220)}, ${rng.pick([
        "Main Road",
        "Industrial Estate",
        "Market Road",
        "Station Road",
        "APMC Yard",
        "Gandhi Nagar",
        "Housing Board Colony",
      ])}, ${rng.pick(region.towns)}`,
      categories,
      primaryCategory,
      directors,
      classLabel: classLabel(primaryCategory, rng.chance(0.4)),
      named: false,
    });
  }

  return vendors;
}

function classLabel(category: CategoryId, senior: boolean) {
  if (["road", "building", "water"].includes(category)) {
    return senior ? "Class I civil contractor" : "Class II civil contractor";
  }
  if (category === "it") return "Empanelled IT vendor";
  if (category === "medsup" || category === "medeq") return "Registered medical supplier";
  if (category === "agri") return "Registered agri supplier";
  if (category === "transport") return "Registered service provider";
  return "Registered supplier";
}

function registrationNumber(id: string, registeredOn: string, legalForm: string) {
  const year = registeredOn.slice(0, 4);
  const kind = legalForm === "Private Limited" ? "PTC" : legalForm === "Public Limited" ? "PLC" : "REG";
  const digits = id.replace(/\D/g, "").padStart(5, "0");
  return `U45200KA${year}${kind}0••${digits.slice(-3)}`;
}

function gstin(name: string, id: string) {
  const letters = name.replace(/[^A-Za-z]/g, "").toUpperCase();
  const digits = id.replace(/\D/g, "");
  return `29${letters.slice(0, 3)}C${letters.slice(3, 4) || "A"}••••${digits.slice(-1)}Z${digits.slice(-2, -1)}`;
}

export const VENDORS: Vendor[] = buildVendors();

export const VENDOR_BY_ID: Record<string, Vendor> = Object.fromEntries(
  VENDORS.map((v) => [v.id, v]),
);

export const NAMED_VENDORS = VENDORS.filter((v) => v.named);

export function vendorName(id: string) {
  return VENDOR_BY_ID[id]?.name ?? id;
}

/** Vendor pools used by the tender generator, keyed by category then region. */
export function vendorPool(categoryId: CategoryId, regionId?: RegionId) {
  return VENDORS.filter(
    (v) => v.categories.includes(categoryId) && (!regionId || v.regionId === regionId),
  );
}
