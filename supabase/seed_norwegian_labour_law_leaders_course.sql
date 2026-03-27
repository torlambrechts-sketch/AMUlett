-- Sample system course: Norwegian Labour Law for Leaders (English content; title/description bilingual)
-- Run in Supabase SQL Editor (as postgres). Re-run safely: deletes prior sample by fixed id, then inserts.

begin;

delete from public.learning_modules where course_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
delete from public.learning_courses where id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;

insert into public.learning_courses (
  id,
  slug,
  title,
  description,
  published,
  scope,
  organization_id
) values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'norwegian-labour-law-for-leaders',
  '{"en":"Norwegian Labour Law for Leaders","nb":"Arbeidsmiljøloven for ledere"}'::jsonb,
  '{"en":"A comprehensive introduction for managers and HR: the Working Environment Act (Arbeidsmiljøloven), employer duties, participation, HSE, working life, and practical leadership actions. Not legal advice—verify with counsel and collective agreements.","nb":"Omfattende introduksjon for ledere og HR: arbeidsmiljøloven, arbeidsgiverplikter, medvirkning, HMS og praktiske tiltak. Ikke juridisk rådgivning."}'::jsonb,
  true,
  'system_default',
  null
);

insert into public.learning_modules (course_id, position, module_type, content) values

-- 0: Executive summary
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 0, 'executive_summary',
'{"points":[
  {"text":"Employers must ensure a fully satisfactory working environment—physically, mentally, and socially."},
  {"text":"Systematic HSE work (internal control) is mandatory: assess risk, implement measures, document, and follow up."},
  {"text":"Employees have rights to information, training, and participation through safety representatives and, where required, the working environment committee (AMU)."},
  {"text":"Leaders are often the employer’s extended arm on site; your behaviour shapes culture, reporting, and compliance."},
  {"text":"Serious breaches can trigger orders from the Labour Inspection Authority (Arbeidstilsynet), fines, and liability."},
  {"text":"Collective agreements and internal policies can add stricter rules than the Act alone."},
  {"text":"Psychosocial factors must be assessed and improved like other working environment risks."},
  {"text":"Procedures for whistleblowing, harassment, and sick leave follow-up are part of sound leadership practice."}
]}'::jsonb),

-- 1: Introduction
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 1, 'rich_text',
'{"paragraphs":[
  {"text":"This course orients leaders to Norwegian working life law with emphasis on the Working Environment Act (Arbeidsmiljøloven, AML). It is designed for managers, team leads, and HR partners who set expectations, allocate work, and represent the undertaking in daily operations."},
  {"text":"Norwegian regulation combines strict statutory duties with strong traditions of cooperation. Understanding both helps you lead lawfully, prevent harm, and build trust."},
  {"text":"Always check your sector’s collective agreements, company agreements, and internal procedures—they may impose additional duties or procedures beyond this overview."}
]}'::jsonb),

-- 2: Legal framework micro-lesson
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 2, 'micro_lesson',
'{"title":"How Norwegian labour law is structured","steps":[
  {"title":"Acts and regulations","body":"The AML is the backbone for health, safety, and environment at work. Supplementary regulations cover specific topics (e.g. organisation, documentation, certain hazards). Other acts address working hours, holidays, leave, and termination (e.g. Working Hours Act, Holiday Act, Leave Act, Working Environment Act provisions on dismissal)."},
  {"title":"Collective agreements","body":"Tariffavtaler between unions and employer associations often expand rights or procedures. If your workplace is bound by an agreement, leaders must know the local rules on overtime, pay, consultation, and dispute steps."},
  {"title":"EU/EEA alignment","body":"Norway implements relevant EU directives in working life. Technical standards and risk-assessment methods often follow European practice even when transposed into national rules."},
  {"title":"Supervision","body":"Arbeidstilsynet supervises large parts of the AML. They can issue orders, coercive fines, and—in serious cases—report matters for prosecution. Cooperation during inspections is expected."}
]}'::jsonb),

-- 3: Short message
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 3, 'short_message',
'{"message":"As a leader you are not expected to be a lawyer—but you are expected to know enough to recognise risks, escalate early, and never instruct anyone to break the law or ignore serious HSE concerns."}'::jsonb),

-- 4: Internal control rich text
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 4, 'rich_text',
'{"paragraphs":[
  {"text":"Chapter 9 of the AML requires systematic health, environment, and safety work—often called internal control (internkontroll). The undertaking must ensure that activities are planned, organised, performed, and maintained so that health and environment are satisfactorily safeguarded."},
  {"text":"In practice this means: identify hazards and problems (including psychosocial factors), assess risk, choose measures, implement them, verify effectiveness, and document so that knowledge survives handovers and audits."},
  {"text":"Leaders contribute by ensuring time and resources for risk assessment, following up action plans, involving employees and safety representatives, and correcting unsafe behaviour without retaliation."},
  {"text":"Documentation should be proportionate: small undertakings need simpler systems than large industrial sites, but every employer must be able to demonstrate how they comply."}
]}'::jsonb),

-- 5: Flash cards
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 5, 'flash_cards',
'{"cards":[
  {"front":"AMU","back":"Arbeidsmiljøutvalg—the working environment committee required in undertakings with usually at least 30 employees (with some exceptions). Prepares matters for discussion between employer and employees."},
  {"front":"Verneombud","back":"Safety representative elected by employees to safeguard health, safety, and environment in cooperation with the employer."},
  {"front":"Arbeidstilsynet","back":"The Norwegian Labour Inspection Authority; supervises compliance with the AML and related regulations."},
  {"front":"Internkontroll","back":"Systematic internal control: the structured process of identifying risk, implementing measures, and documenting HSE work."},
  {"front":"Psykososialt miljø","back":"The psychosocial working environment: organisation of work, social relations, leadership, and factors affecting mental health and well-being."},
  {"front":"Varsling","back":"Whistleblowing: reporting censurable conditions. Special rules protect good-faith reporters in many situations."},
  {"front":"Hovedverneombud","back":"Chief safety representative coordinating safety reps when several exist in the same undertaking."},
  {"front":"Bedriftshelsetjenesten (BHT)","back":"Occupational health service—external or internal experts assisting risk assessment and health follow-up where required."}
]}'::jsonb),

-- 6: Physical environment
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 6, 'micro_lesson',
'{"title":"Physical working environment","steps":[
  {"title":"Premises and equipment","body":"Workplaces must be designed and maintained so that employees are not exposed to accident or health hazards. Machinery, chemicals, ergonomics, noise, vibration, and lighting are typical topics in risk assessments."},
  {"title":"Chemical and biological agents","body":"Use safety data sheets, substitution principles, and exposure controls. Leaders ensure that procedures are followed and that employees receive necessary training and protective equipment."},
  {"title":"Ergonomics and workload","body":"Repetitive work, heavy lifting, and static positions must be assessed. Adjust work organisation, tools, and breaks to reduce musculoskeletal and fatigue-related harm."},
  {"title":"Violence and threats","body":"Where risk exists (e.g. care, retail, transport), employers must assess and reduce risk, including through training, staffing, and technical measures."}
]}'::jsonb),

-- 7: Psychosocial rich text
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 7, 'rich_text',
'{"paragraphs":[
  {"text":"The AML requires the psychosocial environment to be fully satisfactory, continuously developed, and subject to the same systematic approach as physical risks. This includes workload, clarity of roles, social support, predictability, and how change is managed."},
  {"text":"Common methods include employee surveys (e.g. mapping tools), structured interviews, reviewing sick leave and turnover, and involving safety representatives. Measures can range from adjusting staffing and deadlines to leadership training and conflict resolution."},
  {"text":"Harassment and discrimination undermine health and may violate both AML and equality law. Leaders must take reports seriously, investigate proportionately, and intervene to stop unacceptable behaviour."}
]}'::jsonb),

-- 8: Participation
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 8, 'micro_lesson',
'{"title":"Participation and cooperation","steps":[
  {"title":"Safety representatives","body":"Employees elect verneombud according to rules in the AML. The employer must provide information, training, and time for the role. Consult the safety rep on risk assessment, measures, and incidents."},
  {"title":"AMU","body":"Where an AMU exists, it addresses overarching HSE strategy, plans, and difficult issues. Prepare cases with documentation; decisions still rest with management within the law."},
  {"title":"Individual participation","body":"Employees must be allowed to contribute to their own working conditions. Meaningful involvement improves risk identification and acceptance of change."},
  {"title":"Strike balance","body":"Cooperation is not a veto right for employees on business decisions, but certain processes (e.g. major organisational change) may trigger consultation duties under law or agreement."}
]}'::jsonb),

-- 9: Mid quiz
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 9, 'quiz',
'{"passPercent":70,"questions":[
  {"id":"q1","question":"What is the core employer duty under the AML regarding the working environment?","choices":[
    {"id":"a","label":"Ensure a fully satisfactory working environment"},
    {"id":"b","label":"Follow employee preferences on all matters"},
    {"id":"c","label":"Avoid documentation to reduce bureaucracy"}
  ],"correctChoiceId":"a"},
  {"id":"q2","question":"Systematic HSE work under Chapter 9 is also known as:","choices":[
    {"id":"a","label":"Internal control (internkontroll)"},
    {"id":"b","label":"Optional best practice"},
    {"id":"c","label":"Only relevant for industrial plants"}
  ],"correctChoiceId":"a"},
  {"id":"q3","question":"The psychosocial working environment:","choices":[
    {"id":"a","label":"Must be assessed and improved like other risks"},
    {"id":"b","label":"Is outside the scope of the AML"},
    {"id":"c","label":"Is solely the employee’s private matter"}
  ],"correctChoiceId":"a"},
  {"id":"q4","question":"Arbeidstilsynet is:","choices":[
    {"id":"a","label":"The Labour Inspection Authority supervising AML compliance"},
    {"id":"b","label":"A trade union"},
    {"id":"c","label":"A private certification body"}
  ],"correctChoiceId":"a"},
  {"id":"q5","question":"Safety representatives (verneombud) are:","choices":[
    {"id":"a","label":"Elected by employees to safeguard HSE in cooperation with the employer"},
    {"id":"b","label":"Appointed solely by management"},
    {"id":"c","label":"Optional in all undertakings"}
  ],"correctChoiceId":"a"}
]}'::jsonb),

-- 10: Working hours
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 10, 'rich_text',
'{"paragraphs":[
  {"text":"Working hours, rest periods, and overtime are primarily regulated by the Working Hours Act (arbeidstidsloven) and supplementary regulations, often modified by collective agreements. Leaders must ensure rosters respect maximum hours, breaks, and off-duty periods."},
  {"text":"Night and weekend work carry stricter rules in many sectors. Young workers enjoy additional protection."},
  {"text":"Overtime must generally be justified by temporary needs and compensated as agreed or required by law. Systematic overwork is both a legal and psychosocial risk."}
]}'::jsonb),

-- 11: Leave and follow-up
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 11, 'rich_text',
'{"paragraphs":[
  {"text":"Holiday entitlements follow the Holiday Act. Leave for illness, care, and family follows separate acts. Leaders coordinate with HR to apply rules correctly and consistently."},
  {"text":"Early follow-up when employees are on sick leave is regulated and supported by dialogue with employee and sometimes BHT or NAV. The goal is sustainable return to work, not pressure to return unsafely."},
  {"text":"Privacy matters: health information is sensitive personal data under the GDPR. Share on a need-to-know basis only."}
]}'::jsonb),

-- 12: Restructuring
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 12, 'rich_text',
'{"paragraphs":[
  {"text":"Transfers of undertakings, outsourcing, and mergers can trigger consultation duties and may protect employees’ rights under the EU/EEA-derived rules implemented in Norway."},
  {"text":"Major organisational changes often require early information to safety representatives or AMU and may overlap with collective agreement procedures."},
  {"text":"Plan communication carefully: uncertainty drives psychosocial risk; transparent timelines and genuine consultation reduce conflict and absenteeism."}
]}'::jsonb),

-- 13: Dismissals
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 13, 'rich_text',
'{"paragraphs":[
  {"text":"Individual dismissals must be objectively justified under the AML (unless special rules apply). Procedural fairness includes consultation with the employee, considering alternatives, and documenting the basis."},
  {"text":"Temporary layoffs (permittering) and redundancies have additional mass-procedure rules when thresholds are met. HR and legal counsel should always be involved in workforce reductions."},
  {"text":"Never dismiss or discipline employees for raising HSE concerns, participating as safety representatives, or whistleblowing in good faith—such retaliation is unlawful and highly damaging."}
]}'::jsonb),

-- 14: On the job
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 14, 'on_the_job',
'{"actions":[
  {"title":"Walk the floor weekly","description":"Observe conditions, talk to employees, and note hazards or stress signals before they become incidents."},
  {"title":"Keep risk assessments alive","description":"After changes in technology, organisation, or staffing, trigger a fresh assessment rather than relying on old documents."},
  {"title":"Respond to reports within agreed time","description":"Define internal SLAs for HSE reports, harassment complaints, and whistleblowing—then meet them."},
  {"title":"Pair new hires with a mentor","description":"Accelerate safe behaviour and cultural onboarding; clarify where to raise concerns."},
  {"title":"Document significant decisions","description":"Brief minutes of AMU preparation, investigation summaries (proportionate), and follow-up plans support accountability."},
  {"title":"Escalate early","description":"When in doubt on legal risk, involve HR, BHT, or external counsel before acting."}
]}'::jsonb),

-- 15: Checklist
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 15, 'checklist',
'{"items":[
  {"id":"c1","label":"I know where our written HSE system and risk assessments are stored."},
  {"id":"c2","label":"I know who our safety representative(s) and AMU chair are (if any)."},
  {"id":"c3","label":"I can explain how employees report HSE concerns and whistleblowing."},
  {"id":"c4","label":"My team’s working hours and overtime comply with law and agreements."},
  {"id":"c5","label":"We assess psychosocial factors when workload or organisation changes."},
  {"id":"c6","label":"I involve safety reps in relevant changes before implementation."},
  {"id":"c7","label":"Harassment and violence risks are addressed in our risk picture."},
  {"id":"c8","label":"Sick leave follow-up follows company procedure and privacy rules."},
  {"id":"c9","label":"I do not retaliate against employees who raise lawful concerns."},
  {"id":"c10","label":"Contractors on site are briefed on our HSE rules."},
  {"id":"c11","label":"Emergency procedures are known and rehearsed where relevant."},
  {"id":"c12","label":"I refresh this checklist after major organisational change."}
]}'::jsonb),

-- 16: Reflection
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 16, 'reflection',
'{"prompt":"Reflect on your own area: (1) What is the top psychosocial risk today? (2) What concrete measure could you initiate within 30 days? (3) Who should be consulted (safety rep, HR, AMU) before you act?"}'::jsonb),

-- 17: Short message encouragement
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 17, 'short_message',
'{"message":"Strong AML compliance is continuous work. Small, visible improvements build more trust than one-off campaigns."}'::jsonb),

-- 18: Final quiz
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 18, 'quiz',
'{"passPercent":75,"questions":[
  {"id":"f1","question":"Which statement best describes harassment from an AML perspective?","choices":[
    {"id":"a","label":"It can harm the psychosocial environment and must be addressed seriously"},
    {"id":"b","label":"It is only a private conflict between employees"},
    {"id":"c","label":"Leaders should never intervene"}
  ],"correctChoiceId":"a"},
  {"id":"f2","question":"Internal control primarily means:","choices":[
    {"id":"a","label":"A systematic cycle of risk assessment, measures, and documentation"},
    {"id":"b","label":"Annual fire drills only"},
    {"id":"c","label":"Delegating all HSE to employees"}
  ],"correctChoiceId":"a"},
  {"id":"f3","question":"Before major organisational change, leaders should typically:","choices":[
    {"id":"a","label":"Inform and consult safety representatives / AMU as required"},
    {"id":"b","label":"Announce changes only after they take effect"},
    {"id":"c","label":"Avoid written records"}
  ],"correctChoiceId":"a"},
  {"id":"f4","question":"Dismissals under the AML require:","choices":[
    {"id":"a","label":"Objective justification and proper procedure"},
    {"id":"b","label":"No particular process if notice period is paid"},
    {"id":"c","label":"Only the employee’s consent"}
  ],"correctChoiceId":"a"},
  {"id":"f5","question":"Overtime should be:","choices":[
    {"id":"a","label":"Exceptional and within legal and agreed limits"},
    {"id":"b","label":"Unlimited if employees agree verbally"},
    {"id":"c","label":"Avoided by law"}
  ],"correctChoiceId":"a"},
  {"id":"f6","question":"The employer’s duty for the working environment is:","choices":[
    {"id":"a","label":"Non-delegable in substance—management remains responsible"},
    {"id":"b","label":"Fully transferred to the safety representative"},
    {"id":"c","label":"Optional for undertakings under 5 employees"}
  ],"correctChoiceId":"a"}
]}'::jsonb),

-- 19: Closing + resources
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 19, 'rich_text',
'{"paragraphs":[
  {"text":"You have now toured the main pillars of Norwegian labour law relevant to leaders: systematic HSE, physical and psychosocial environment, participation structures, working hours context, change, and dismissal fairness."},
  {"text":"Use official guidance from Arbeidstilsynet and Lovdata for authoritative texts. Your HR department, BHT, and legal counsel interpret rules in your specific context."},
  {"text":"Disclaimer: This course is for training purposes only and does not constitute legal advice."}
]}'::jsonb),

-- 20: Video placeholder (optional link later)
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 20, 'video',
'{"url":"","caption":"Replace with a link to your organisation’s AML onboarding video or an official Arbeidstilsynet resource when available."}'::jsonb);

commit;
