export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  category: 'Maternal Health' | 'Cervical & Oncology' | 'Fertility & Endometriosis' | 'Health Tech & Telemetry' | 'Policy & Community';
  date: string;
  readTime: string;
  summary: string;
  image: string;
  imageAlt: string;
  author: string;
  authorRole: string;
  fullBody: string[];
  takeaways: string[];
  pullQuote?: {
    text: string;
    author: string;
    role: string;
  };
}

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    id: 'news-1',
    slug: 'cervical-cancer-screening-initiative',
    title: 'Red Apple Health and Federal Ministry Launch Initiative to Screen 120,000 Women for Cervical Cancer',
    category: 'Cervical & Oncology',
    date: '28th September 2026',
    readTime: '4 min read',
    summary: 'Deploying portable AI-assisted thermal ablation and digital colposcopy across primary healthcare centers to detect high-risk HPV and precancerous lesions years before malignancy develops.',
    image: '/images/clinical-care.jpg',
    imageAlt: 'Healthcare clinicians operating screening diagnostics in clinic',
    author: 'Dr. Folashade Adeleke, FWACS',
    authorRole: 'Head of Oncology & Clinical Protocols, Red Apple Health',
    pullQuote: {
      text: 'Almost 85% of cervical cancer deaths in Africa are completely preventable if we eliminate the multi-week delay between testing and treatment. The single-visit screen-and-treat protocol removes loss-to-follow-up entirely.',
      author: 'Dr. Folashade Adeleke',
      role: 'Head of Oncology, Red Apple Health'
    },
    takeaways: [
      'Targets 120,000 women screened across 42 local government wards by Q2 2027.',
      'Single-visit screen-and-treat protocol cuts patient loss-to-follow-up rate from 60% to under 4%.',
      'Battery-powered thermal ablation delivers a 94% clearance rate for pre-cancerous cervical intraepithelial neoplasia (CIN 2/3).',
      'Diagnostics automatically synced with Red Apple OS for secure patient digital follow-up.'
    ],
    fullBody: [
      'Cervical cancer remains the leading cause of female cancer mortality in Sub-Saharan Africa, claiming more than 75,000 lives each year—over 85% of which could be prevented through timely human papillomavirus (HPV) detection and precancer lesion ablation.',
      'In collaboration with state primary healthcare development boards across Lagos and Ogun states, Red Apple Health has deployed 60 mobile screening teams equipped with point-of-care HPV DNA diagnostics and portable battery-powered thermal ablation units.',
      'Historically, cervical screening in rural and peri-urban centers required multiple hospital visits: cytology testing, waiting weeks for laboratory results, and returning for colposcopic biopsy. Over 60% of at-risk patients never returned for secondary treatment. By implementing an AI-assisted single-visit protocol, midwives can identify acetowhite lesions on high-resolution smartphone colposcopy and perform same-day ablation in under 4 minutes.',
      'Every patient screened receives an encrypted mobile health record accessible through the Red Apple App, ensuring automated reminders for routine 3-year surveillance checkups.'
    ]
  },
  {
    id: 'news-2',
    slug: 'who-emotive-protocol-maternity-trial',
    title: 'Clinical Trial Validates WHO E-MOTIVE Protocol with Red Apple OS, Cutting Postpartum Hemorrhage Delays by 58%',
    category: 'Maternal Health',
    date: '18th September 2026',
    readTime: '5 min read',
    summary: 'A multi-center maternity trial across 18 secondary hospitals demonstrates that combining calibrated blood-loss drapes with automated clinical alerts drastically cuts maternal morbidity.',
    image: '/images/maternal-wellness.jpg',
    imageAlt: 'Maternity ward clinical team with digital health monitor',
    author: 'Clinical Advisory Board',
    authorRole: 'Obstetric Emergency Working Group, Red Apple Health',
    pullQuote: {
      text: 'Maternal hemorrhage moves in minutes. The barrier in our maternity wards was never diagnostic ignorance—it was clinical latency. Once blood collection drapes trigger real-time tablet alerts, midwives act before hemorrhagic shock sets in.',
      author: 'Prof. Babatunde Jinadu, FMCOG',
      role: 'Principal Investigator, Maternity Trial'
    },
    takeaways: [
      'Average treatment initiation time dropped from 42 minutes to under 8 minutes post-delivery.',
      '58% reduction in severe postpartum hemorrhage rates among enrolled deliveries (n=14,280).',
      'Zero-latency offline mode ensures continuous protocol guidance during hospital power grid outages.',
      'Integrated with WHO-standard clinical bundles (calibrated drape, oxytocics, tranexamic acid, IV fluids).'
    ],
    fullBody: [
      'Postpartum hemorrhage (PPH) is the single largest driver of maternal mortality globally, responsible for approximately 27% of maternal deaths across Africa. The fundamental bottleneck in low-resource maternity wards has never been a lack of knowledge, but delayed detection of blood loss until hypovolemic shock is already advanced.',
      'In an 18-hospital clinical trial conducted alongside obstetrics researchers at University College Hospital (UCH) and Korle-Bu Teaching Hospital, Red Apple OS integrated the WHO-endorsed E-MOTIVE protocol into ruggedized clinic tablets.',
      'Midwives record real-time drape volume readings with a single tap. If blood loss reaches 300mL within 15 minutes of placental delivery, the system initiates an audible protocol alert and displays a step-by-step medication administration checklist (heat-stable carbetocin/oxytocin, uterine massage, tranexamic acid, and fluid resuscitation).',
      'The clinical trial recorded a 58% reduction in severe hemorrhage progression, validating that digital clinical governance can transform maternity ward survival rates across secondary healthcare tiers.'
    ]
  },
  {
    id: 'news-3',
    slug: 'endometriosis-pcos-diagnostic-delays-study',
    title: 'Red Apple Publishes Landmark Sub-Saharan Study on Endometriosis and PCOS Diagnostic Delays',
    category: 'Fertility & Endometriosis',
    date: '4th September 2026',
    readTime: '6 min read',
    summary: 'Drawing on anonymized cycle logs from 48,000 women, the report reveals an average 8.4-year diagnostic gap for endometriosis in West Africa driven by menstrual stigma and symptom dismissal.',
    image: '/images/pillar-app.jpg',
    imageAlt: 'Mobile cycle analytics and hormonal symptom tracking interface',
    author: 'Dr. Chisomebi Nwosu, MB.BS, FWACS',
    authorRole: 'Reproductive Endocrinology Lead, Red Apple Health',
    pullQuote: {
      text: 'For decades, African women experiencing debilitating menstrual pain were told it was simply their cross to bear. By quantifying this 8.4-year diagnostic delay with real symptom data, we are turning silent suffering into clinical urgency.',
      author: 'Dr. Chisomebi Nwosu',
      role: 'Reproductive Endocrinology Lead'
    },
    takeaways: [
      'Average diagnostic delay: 8.4 years for endometriosis; 4.1 years for Polycystic Ovary Syndrome (PCOS).',
      '72% of surveyed women experienced debilitating pelvic pain for over five years before receiving a specialized pelvic ultrasound.',
      'Deployment of Red Apple’s in-app Endometriosis Risk Index, connecting high-risk users to vetted specialists in under 24 hours.',
      'Partnership formed with regional surgical centers to provide subsidized diagnostic laparoscopy.'
    ],
    fullBody: [
      'Despite affecting an estimated 1 in 10 reproductive-aged women, endometriosis and Polycystic Ovary Syndrome (PCOS) remain severely underdiagnosed across African healthcare ecosystems. Symptoms such as severe cyclic pelvic pain, dyspareunia, and chronic fatigue are frequently dismissed as standard menstrual discomfort.',
      'Red Apple’s medical data division analyzed over 280,000 anonymized cycle logs and correlated self-reported pain indicators with clinical ultrasound outcomes from partner diagnostic centers in Lagos, Accra, and Nairobi.',
      'The epidemiological findings demonstrate that patients wait an average of 8.4 years from the onset of chronic pelvic pain to receiving a formal endometriosis diagnosis, during which many suffer irreversible ovarian endometrioma growth and tubal scarring.',
      'In response, Red Apple has deployed an algorithmic early warning model within the consumer mobile application. Users logging high-intensity dysmenorrhea, acyclic pelvic pain, or irregular cycles receive automated prompts to schedule specialized transvaginal pelvic scans and virtual consultations with certified reproductive endocrinologists.'
    ]
  },
  {
    id: 'news-4',
    slug: 'handheld-ai-ultrasound-community-midwives',
    title: 'Handheld AI Ultrasound Deployment Equips 240 Community Midwives for High-Risk Pregnancy Detection',
    category: 'Health Tech & Telemetry',
    date: '28th August 2026',
    readTime: '4 min read',
    summary: 'Equipping rural maternity posts with pocket-sized ultrasound probes allows bedside identification of placenta previa, malpresentation, and multiple gestations months before labor.',
    image: '/images/community-outreach.jpg',
    imageAlt: 'Community midwife performing ultrasound scan during antenatal outreach',
    author: 'Amina Bello, RN, RM, MPH',
    authorRole: 'Director of Midwifery & Field Outreach, Red Apple Health',
    pullQuote: {
      text: 'Putting an ultrasound probe in the hands of a rural midwife transforms her clinic from an unassisted delivery outpost into an advanced antenatal triage hub.',
      author: 'Amina Bello, RN, RM, MPH',
      role: 'Director of Midwifery, Red Apple Health'
    },
    takeaways: [
      '240 community healthcare clinics equipped with portable ultrasound probes and solar-backed tablets.',
      'Over 3,100 high-risk gestational anomalies identified and referred before the onset of active labor.',
      'Over 420 asymptomatic placenta previa cases identified, preventing catastrophic emergency hemorrhages.',
      'Ultrasound clips automatically reviewed asynchronously by consultant radiologists via Red Apple Connect.'
    ],
    fullBody: [
      'In rural and peri-urban maternity health posts across West Africa, fewer than 22% of expectant mothers receive the WHO-recommended mid-trimester structural ultrasound scan. The high capital cost of stationary cart-based ultrasound machines and the scarcity of trained sonographers create an acute diagnostic void.',
      'Red Apple Health has distributed 240 handheld ultrasound probes paired with tablet-based computer vision models to certified community midwives across six geopolitical zones.',
      'The software provides real-time guidance overlays to help midwives verify fetal presentation, calculate amniotic fluid index (AFI), and locate placental insertion. If a potentially dangerous presentation—such as complete placenta previa or transverse lie—is detected, the scan clip is transmitted via low-bandwidth cellular telemetry to Red Apple Connect’s on-call OB-GYN network for rapid secondary review.',
      'By diagnosing these conditions weeks before delivery, mothers are scheduled for elective cesarean delivery at tertiary referral centers, avoiding fatal unassisted labor complications.'
    ]
  },
  {
    id: 'news-5',
    slug: 'decriminalizing-menstrual-health-zero-vat-policy',
    title: 'Decriminalizing Menstrual Health: Red Apple and Regional Advocates Advance Zero-VAT Policy on Sanitary Products',
    category: 'Policy & Community',
    date: '19th August 2026',
    readTime: '5 min read',
    summary: 'Policy coalition presents empirical economic data to the ECOWAS health commission showing period poverty directly reduces female secondary school attendance by 23%.',
    image: '/images/card-community.jpg',
    imageAlt: 'Community health advocates holding reproductive education materials',
    author: 'Public Health Policy Unit',
    authorRole: 'Red Apple Health & African Women’s Health Coalition',
    pullQuote: {
      text: 'Taxing sanitary products as luxury goods penalizes biology. Our economic modeling proves that eliminating sanitary taxes costs governments negligible revenue while preserving girl-child educational completion.',
      author: 'Policy Working Group',
      role: 'African Women’s Health Coalition'
    },
    takeaways: [
      'Econometric modeling demonstrates that eliminating VAT on sanitary products increases secondary school attendance by up to 23%.',
      'Submission of the Zero-VAT Sanitary Products Model Bill to national legislative assemblies.',
      'Red Apple commits 500,000 biodegradable sanitary pad packs distributed across rural public schools.',
      'In-app reproductive hygiene and cycle education modules translated into Hausa, Yoruba, Igbo, and Twi.'
    ],
    fullBody: [
      'Menstrual health is foundational to female educational achievement and reproductive dignity. Across West Africa, an estimated 65% of adolescent girls in rural communities lack regular access to commercial sanitary products, frequently resulting in missed school days and elevated rates of ascending reproductive tract infections.',
      'Red Apple Health’s policy team, in conjunction with the African Women’s Development Fund, presented an empirical econometric brief to the ECOWAS parliamentary health committee.',
      'The report illustrates that classifying menstrual hygiene items as luxury goods rather than essential medical necessities inflicts a compounding societal cost. Removing value-added tax (VAT) and import duties on menstrual products would cost governments less than 0.04% of fiscal revenue while yielding substantial economic dividends through girl-child educational retention.',
      'Concurrently, Red Apple launched its School Health Dignity Program, pairing free biodegradable pad distributions with culturally contextual, multi-lingual reproductive health guides across 180 secondary schools.'
    ]
  },
  {
    id: 'news-6',
    slug: 'low-cost-iui-infertility-destigmatization',
    title: 'Overcoming Infertility Stigma: Red Apple Connect Launches Subsidized Low-Cost IUI and Tele-Endocrinology',
    category: 'Fertility & Endometriosis',
    date: '17th August 2026',
    readTime: '5 min read',
    summary: 'New clinical protocol addresses the devastating cultural isolation of involuntary childlessness by expanding access to ovulation induction, diagnostic workups, and compassionate counseling.',
    image: '/images/pillar-connect.jpg',
    imageAlt: 'Doctor reviewing reproductive fertility scan with patient on video',
    author: 'Clinical Communications Desk',
    authorRole: 'Fertility & Family Planning Wing, Red Apple Health',
    pullQuote: {
      text: 'Infertility in our communities is too often treated as a moral failing rather than a manageable medical diagnosis. By testing both partners and subsidizing first-line IUI, we are restoring hope and marital peace.',
      author: 'Dr. Mesal Akande',
      role: 'Clinical Operations Director'
    },
    takeaways: [
      'Average cost of comprehensive fertility diagnostic workup reduced by 64% through partnered labs.',
      'Standardized low-cost intrauterine insemination (IUI) protocols implemented in 12 partner clinics.',
      'Dual-partner diagnostic testing framework designed to break cultural stigma blaming women for infertility.',
      'Confidential mental health tele-counseling integrated into every assisted reproduction patient journey.'
    ],
    fullBody: [
      'In Sub-Saharan Africa, secondary infertility carries immense social and emotional stigma. Women frequently bear the full psychological burden of involuntary childlessness, facing ostracization, emotional distress, and abandonment, despite male-factor subfertility contributing to roughly half of all cases.',
      'Moreover, commercial in-vitro fertilization (IVF) remains financially out of reach for over 95% of families, with single cycles commanding fees exceeding three times the average annual household income.',
      'Red Apple Connect has unveiled the Assisted Reproduction Access Initiative, providing evidence-based, low-cost fertility management. Through bulk partnerships with diagnostic laboratories, couples receive affordable hormonal profiles, semen analysis, and hysterosalpingography (HSG).',
      'For eligible couples with patent fallopian tubes and mild male subfertility, Red Apple provides subsidized intrauterine insemination (IUI) protocols at a fraction of IVF costs, paired with dedicated psychological counseling to help couples navigate cultural pressures together.'
    ]
  },
  {
    id: 'news-7',
    slug: 'sub-saharan-breast-health-early-screening',
    title: 'Sub-Saharan Breast Health Initiative: Community Clinical Hubs Screen 45,000 Women Under 45',
    category: 'Cervical & Oncology',
    date: '8th August 2026',
    readTime: '5 min read',
    summary: 'Addressing the uniquely aggressive presentation of triple-negative breast cancer in younger African demographics through mobile clinical breast examinations and rapid biopsy referral.',
    image: '/images/about-clinic-entrance.jpg',
    imageAlt: 'Clinic entrance with community healthcare outreach vehicles',
    author: 'Dr. Mesal Akande, MD',
    authorRole: 'Clinical Operations Director, Red Apple Health',
    pullQuote: {
      text: 'African breast cancer is unique: our patients are younger, and the tumors are biologically aggressive. When we condense the biopsy wait time from three months to eleven days, we turn terminal disease into curable pathology.',
      author: 'Dr. Folashade Adeleke',
      role: 'Head of Oncology, Red Apple Health'
    },
    takeaways: [
      '45,000 women screened through 30 clinical hubs and mobile breast diagnostic vans.',
      '78% of detected malignant lesions identified at Stage I and II, reversing regional late-stage baselines.',
      'Fast-track ultrasound-guided core needle biopsy turnaround accelerated from 3 months to 11 days.',
      'Multidisciplinary virtual tumor boards review complex cases on Red Apple Connect.'
    ],
    fullBody: [
      'Breast cancer in Sub-Saharan Africa exhibits an epidemiological profile distinct from Western countries. African women present on average 10 to 15 years earlier, often in their thirties and early forties, with a higher prevalence of biologically aggressive triple-negative tumors.',
      'Late-stage diagnosis remains the primary determinant of poor outcomes; historically, over 70% of patients present at Stage III or IV, when curative interventions are severely limited.',
      'Red Apple Health’s community oncology division established 30 designated clinical triage hubs across high-density urban areas. Women performing breast self-examinations can utilize Red Apple’s guided in-app symptom tracker to log focal tenderness, skin retraction, or discrete lumps.',
      'Suspect cases are immediately triaged to clinical hubs for palpation, high-frequency breast ultrasonography, and same-week core needle biopsy, shortening the critical interval from symptom recognition to definitive histology to under two weeks.'
    ]
  },
  {
    id: 'news-8',
    slug: 'digital-antenatal-telemetry-preeclampsia-surveillance',
    title: 'Digital Antenatal Telemetry: Remote Blood Pressure Surveillance Halts Preeclampsia Complications',
    category: 'Maternal Health',
    date: '24th July 2026',
    readTime: '4 min read',
    summary: 'Deploying bluetooth-enabled sphygmomanometers and automated urinalysis strips to high-risk expectant mothers reduces emergency eclampsia hospital admissions by 44%.',
    image: '/images/card-telehealth.jpg',
    imageAlt: 'Midwife showing expectant mother blood pressure monitor',
    author: 'Health Systems & Telemetry Team',
    authorRole: 'Maternal Care Telehealth Division, Red Apple Health',
    pullQuote: {
      text: 'Preeclampsia strikes quietly between routine monthly clinic appointments. Connecting home blood pressure telemetry to the clinic dashboard allows doctors to intervene long before a seizure occurs.',
      author: 'Dr. Chisomebi Nwosu',
      role: 'Clinical Advisory Board'
    },
    takeaways: [
      '5,200 expectant mothers with hypertensive pregnancy profiles enrolled across 3 states.',
      '44% reduction in emergency eclampsia hospital admissions among active remote telemetry cohort.',
      'Automated critical alerts triggered when systolic pressure exceeds 140 mmHg or severe symptoms arise.',
      'Average gestational age at delivery extended by 2.4 weeks, reducing neonatal intensive care admissions.'
    ],
    fullBody: [
      'Hypertensive disorders of pregnancy, including chronic hypertension, gestational hypertension, and preeclampsia, account for approximately 16% of all maternal deaths in West Africa. Preeclampsia can progress rapidly from asymptomatic blood pressure elevation to life-threatening eclamptic seizures, hepatic rupture, or maternal stroke.',
      'Red Apple Health rolled out a home telemetry monitoring kit for expectant mothers diagnosed with elevated cardiovascular risks during routine antenatal clinic visits.',
      'The kit includes a validated digital blood pressure monitor and proteinuria test strips. When patients record daily readings, the data synchronizes via bluetooth directly with Red Apple OS.',
      'If a reading breaches clinical safety thresholds—or if the patient logs danger symptoms like persistent frontal headaches, visual disturbance, or epigastric pain—an automated emergency SMS and clinical dashboard flag alert the patient’s managing obstetrician, allowing timely administration of magnesium sulfate and planned delivery.'
    ]
  },
  {
    id: 'news-9',
    slug: 'postpartum-depression-screening-infant-immunization',
    title: 'Integrating Maternal Mental Health: Screening for Postpartum Depression at Routine 6-Week Infant Immunizations',
    category: 'Maternal Health',
    date: '11th July 2026',
    readTime: '6 min read',
    summary: 'Partnering with primary healthcare centers to incorporate the Edinburgh Postnatal Depression Scale into infant vaccine clinics, breaking taboos around maternal psychological wellness.',
    image: '/images/red-apple-family.jpg',
    imageAlt: 'Mother, baby and family in healthy clinical setting',
    author: 'Maternal Wellness Collective',
    authorRole: 'Psychological Support Unit, Red Apple Health',
    pullQuote: {
      text: 'Mothers rarely schedule appointments solely for their own mental distress, but they never miss their baby’s vaccines. Screening them at immunization visits brings care directly where mothers already gather.',
      author: 'Maternal Wellness Lead',
      role: 'Psychological Support Unit'
    },
    takeaways: [
      'Over 22,000 new mothers screened across 40 primary healthcare facilities during infant immunization visits.',
      'Identification of moderate-to-severe postpartum depressive symptoms increased by 310%.',
      'Confidential multi-lingual teletherapy sessions provided through Red Apple Connect.',
      '92% of mothers completing virtual therapy reported marked reductions in clinical anxiety and depression scores.'
    ],
    fullBody: [
      'Up to 1 in 3 mothers in Sub-Saharan Africa experience postpartum depression (PPD) or severe perinatal anxiety. However, due to acute cultural stigma and misconceptions that motherhood must be met solely with joy, maternal mental health remains heavily undertreated.',
      'Because nearly 85% of mothers consistently attend local healthcare centers for their newborn’s 6-week and 10-week pentavalent vaccine visits, Red Apple collaborated with clinic administrators to integrate the Edinburgh Postnatal Depression Scale (EPDS) directly into nurse-administered checkups on Red Apple OS.',
      'Mothers screening positive for significant depressive indicators or self-harm ideation are offered immediate, confidential virtual appointments with certified maternal mental health counselors on Red Apple Connect.',
      'By providing discreet counseling via phone or video in indigenous languages, the program ensures mothers receive trauma-informed clinical care without fear of community judgment.'
    ]
  }
];

export function getArticleBySlug(slug: string): NewsArticle | undefined {
  return NEWS_ARTICLES.find(
    (a) => a.slug === slug || a.id === slug || a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug
  );
}
