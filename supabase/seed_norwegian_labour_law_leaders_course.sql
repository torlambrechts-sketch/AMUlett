-- Advanced system course: Norwegian Labour Law for Leaders — all LMS block types demonstrated
-- Fixed course id for idempotent re-seed. Run in Supabase SQL Editor (postgres).

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
  '{"en":"Advanced training for managers and HR: AML, HSE, participation, working hours, change, and dismissals — with every learning format (rich text, video, quiz, flash cards, SCORM/H5P placeholders, assignment, forum, and more). Not legal advice; verify with counsel and agreements.","nb":"Avansert opplæring for ledere og HR: AML, HMS, medvirkning, arbeidstid, omstilling og oppsigelser — med alle læringsformater. Ikke juridisk rådgivning."}'::jsonb,
  true,
  'system_default',
  null
);

insert into public.learning_modules (course_id, position, module_type, content) values

-- 0: Executive summary
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 0, 'executive_summary', $c0$
{"points":[
  {"text":"Employers must ensure a fully satisfactory working environment — physically, mentally, and socially (AML)."},
  {"text":"Systematic HSE work (internal control, Chapter 9) is mandatory: identify risk, implement measures, document, and follow up."},
  {"text":"Employees have rights to information, training, and participation via safety representatives and, where required, AMU."},
  {"text":"Leaders represent the undertaking on the floor; culture, reporting, and compliance follow from visible behaviour."},
  {"text":"Serious breaches can lead to orders from Arbeidstilsynet, fines, and liability — collective agreements may add stricter rules."},
  {"text":"Psychosocial factors must be assessed and improved using the same systematic approach as physical risks."},
  {"text":"Sound practice includes clear procedures for whistleblowing, harassment, and sick-leave follow-up within privacy rules."}
]}
$c0$::jsonb),

-- 1: Rich text (HTML — headings, lists, emphasis)
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 1, 'rich_text', $c1$
{"html":"<h2>Your role as a leader</h2><p>This course orients you to the <strong>Working Environment Act</strong> (Arbeidsmiljøloven, AML) and related rules. It is for managers, team leads, and HR who set expectations, allocate work, and represent the employer day to day.</p><h3>Why it matters</h3><ul><li>Norwegian law sets <strong>strict employer duties</strong> that cannot be “opted out” by contract.</li><li><em>Cooperation</em> with employees and safety reps is built into the system — not optional politeness.</li><li>Your <strong>sector agreements</strong> and internal policies may add procedures beyond this overview.</li></ul><p>Always verify critical decisions with HR, BHT, or legal counsel.</p>"}
$c1$::jsonb),

-- 2: Video (replace URL with your organisation’s video or an official resource)
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 2, 'video', $c2$
{"url":"https://www.youtube.com/watch?v=iG9CE55wbtY","caption":"Example embed (TED). Replace with your AML onboarding clip or an official Arbeidstilsynet / internal media link."}
$c2$::jsonb),

-- 3: Micro lesson — legal structure
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 3, 'micro_lesson', $c3$
{"title":"How Norwegian labour law is structured","steps":[
  {"title":"Acts and regulations","body":"The AML is the backbone for health, safety, and environment. Supplementary regulations cover organisation, documentation, and specific hazards. Other acts govern working hours, holidays, leave, and dismissal."},
  {"title":"Collective agreements","body":"Tariffavtaler often expand rights or procedures. If your workplace is bound by an agreement, know the rules on overtime, consultation, and disputes."},
  {"title":"EU/EEA","body":"Norway implements relevant EU directives. Risk-assessment methods and technical standards often follow European practice."},
  {"title":"Supervision","body":"Arbeidstilsynet supervises much of the AML. They can issue orders and coercive fines; cooperate professionally during inspections."}
]}
$c3$::jsonb),

-- 4: Short message
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 4, 'short_message', '{"message":"You are not expected to be a lawyer — but you must recognise risks, escalate early, and never instruct anyone to ignore serious HSE concerns or lawful employee rights."}'::jsonb),

-- 5: Flash cards
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 5, 'flash_cards', $c5$
{"cards":[
  {"front":"AMU","back":"Arbeidsmiljøutvalg — required in many undertakings (typically ≥30 employees, subject to rules). Prepares HSE matters for employer–employee dialogue."},
  {"front":"Verneombud","back":"Safety representative elected by employees to safeguard HSE in cooperation with the employer."},
  {"front":"Arbeidstilsynet","back":"Norwegian Labour Inspection Authority — supervises compliance with the AML and related regulations."},
  {"front":"Internkontroll","back":"Systematic internal control: identify hazards, assess risk, implement measures, verify, document."},
  {"front":"Psykososialt miljø","back":"Psychosocial environment: work organisation, leadership, social relations, and mental health factors."},
  {"front":"Varsling","back":"Whistleblowing — reporting censurable conditions; statutory protections apply in many situations."},
  {"front":"Hovedverneombud","back":"Chief safety representative when multiple verneombud exist."},
  {"front":"BHT","back":"Bedriftshelsetjenesten — occupational health service assisting risk assessment and health follow-up."}
]}
$c5$::jsonb),

-- 6: Image gallery (placeholders — swap for your assets / Supabase Storage URLs)
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 6, 'image_gallery', $c6$
{"images":[
  {"url":"https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80","caption":"Court / justice imagery — symbolic reference to legal frameworks (decorative)."},
  {"url":"https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80","caption":"Team collaboration — participation and dialogue under the AML."},
  {"url":"https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1200&q=80","caption":"Workplace safety — PPE and physical risk controls (illustrative)."}
]}
$c6$::jsonb),

-- 7: Micro lesson — physical environment
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 7, 'micro_lesson', $c7$
{"title":"Physical working environment","steps":[
  {"title":"Premises and equipment","body":"Workplaces must be designed and maintained to prevent accidents and ill health. Cover machinery, ergonomics, noise, lighting, and chemicals."},
  {"title":"Chemical and biological agents","body":"Use safety data sheets, substitution, and exposure controls. Train workers and provide PPE where needed."},
  {"title":"Ergonomics","body":"Address repetitive work, lifting, and static postures through organisation, tools, and breaks."},
  {"title":"Violence and threats","body":"Assess sectors with exposure; use staffing, training, and design to reduce risk."}
]}
$c7$::jsonb),

-- 8: Rich text — psychosocial
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 8, 'rich_text', $c8$
{"paragraphs":[
  {"text":"The AML requires the psychosocial environment to be fully satisfactory and developed systematically — like physical risks. That includes workload, role clarity, social support, predictability, and how change is led."},
  {"text":"Use surveys, interviews, sick-leave patterns, and safety-rep input. Measures range from adjusting deadlines to leadership training and conflict resolution."},
  {"text":"Harassment and discrimination undermine health and may breach equality law. Take reports seriously, investigate proportionately, and stop unacceptable behaviour."}
]}
$c8$::jsonb),

-- 9: Micro lesson — participation
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 9, 'micro_lesson', $c9$
{"title":"Participation and cooperation","steps":[
  {"title":"Safety representatives","body":"Elected verneombud must get information, training, and time. Consult them on risk assessments, measures, and incidents."},
  {"title":"AMU","body":"Where established, AMU addresses overarching HSE plans and difficult issues. Prepare cases with documentation."},
  {"title":"Individual participation","body":"Employees shall contribute to their working conditions — meaningful involvement improves risk identification."},
  {"title":"Balance","body":"Cooperation is not a veto on all business decisions, but major change may trigger consultation under law or agreements."}
]}
$c9$::jsonb),

-- 10: Quiz — randomized draw from bank (2 of 3 each attempt)
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 10, 'quiz', $c10$
{"passPercent":70,"randomCount":2,"questionBank":[
  {"id":"b1","type":"multiple_choice","question":"What is the core employer duty under the AML?","choices":[
    {"id":"a","label":"Ensure a fully satisfactory working environment"},
    {"id":"b","label":"Follow employee preferences on every matter"},
    {"id":"c","label":"Avoid documentation to reduce bureaucracy"}
  ],"correctChoiceId":"a"},
  {"id":"b2","type":"multiple_choice","question":"Systematic HSE under Chapter 9 is often called:","choices":[
    {"id":"a","label":"Internal control (internkontroll)"},
    {"id":"b","label":"Optional best practice"},
    {"id":"c","label":"Only for heavy industry"}
  ],"correctChoiceId":"a"},
  {"id":"b3","type":"multiple_choice","question":"Arbeidstilsynet is:","choices":[
    {"id":"a","label":"The Labour Inspection Authority"},
    {"id":"b","label":"A trade union"},
    {"id":"c","label":"A certification body"}
  ],"correctChoiceId":"a"}
]}
$c10$::jsonb),

-- 10b: Quiz — advanced question types (fixed set)
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 11, 'quiz', $c10b$
{"passPercent":70,"questions":[
  {"id":"q1","type":"multiple_choice","question":"The psychosocial working environment must be:","choices":[
    {"id":"a","label":"Assessed and improved systematically like other risks"},
    {"id":"b","label":"Outside the AML"},
    {"id":"c","label":"Left to employees only"}
  ],"correctChoiceId":"a"},
  {"id":"q_ms","type":"multi_select","question":"Which topics are typically part of systematic HSE (select all that apply)?","choices":[
    {"id":"a","label":"Risk assessment"},
    {"id":"b","label":"Measures and follow-up"},
    {"id":"c","label":"Ignoring psychosocial factors"},
    {"id":"d","label":"Documentation proportionate to risk"}
  ],"correctChoiceIds":["a","b","d"]},
  {"id":"q_mat","type":"matching","question":"Match each concept to its description","leftColumn":[
    {"id":"L1","label":"Verneombud"},
    {"id":"L2","label":"AMU"},
    {"id":"L3","label":"Internkontroll"}
  ],"rightColumn":[
    {"id":"R1","label":"Elected employee HSE role"},
    {"id":"R2","label":"Committee in larger undertakings"},
    {"id":"R3","label":"Systematic risk cycle"}
  ],"correctPairs":[
    {"leftId":"L1","rightId":"R1"},
    {"leftId":"L2","rightId":"R2"},
    {"leftId":"L3","rightId":"R3"}
  ]},
  {"id":"q_open","type":"open_ended","question":"In one sentence: what will you verify in your team next week regarding AML compliance?","sampleAnswer":"Example: I will confirm risk assessments exist for recent process changes and that the verneombud was consulted."}
]}
$c10b$::jsonb),

-- 11–14: Rich text sections
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 12, 'rich_text', $c11$
{"paragraphs":[
  {"text":"Working hours, rest, and overtime are governed by the Working Hours Act and agreements. Ensure rosters respect maximum hours, breaks, and off-duty periods; night and weekend rules vary by sector. Young workers have extra protection."},
  {"text":"Overtime must be exceptional and compensated per law or agreement. Chronic overwork is both a legal and psychosocial risk."}
]}
$c11$::jsonb),

('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 13, 'rich_text', $c12$
{"paragraphs":[
  {"text":"Holiday rights follow the Holiday Act. Illness, care, and parental leave follow separate acts — coordinate with HR for consistent application."},
  {"text":"Early sick-leave follow-up is regulated; work with the employee, BHT, or NAV as appropriate. Health data is sensitive under GDPR — need-to-know only."}
]}
$c12$::jsonb),

('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 14, 'rich_text', $c13$
{"paragraphs":[
  {"text":"Transfers, outsourcing, and mergers can trigger consultation duties and protect employee rights under EEA-derived rules."},
  {"text":"Major change usually requires early dialogue with safety reps or AMU. Uncertainty increases psychosocial risk — communicate timelines clearly."}
]}
$c13$::jsonb),

('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 15, 'rich_text', $c14$
{"paragraphs":[
  {"text":"Dismissals must be objectively justified and procedurally fair under the AML (where applicable). Involve HR/legal for redundancies and mass procedures."},
  {"text":"Never retaliate against employees for HSE concerns, safety-rep duties, or good-faith whistleblowing."}
]}
$c14$::jsonb),

-- 15: On the job
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 16, 'on_the_job', $c15$
{"actions":[
  {"title":"Weekly floor presence","description":"Observe conditions and talk to employees before hazards become incidents."},
  {"title":"Refresh risk assessments after change","description":"New tools, org charts, or sites need updated assessments — not old PDFs on a shelf."},
  {"title":"Meet internal SLAs","description":"Define response times for HSE reports and harassment complaints — then honour them."},
  {"title":"Mentor new hires","description":"Pair with a colleague who models safe behaviour and knows escalation paths."},
  {"title":"Document key decisions","description":"Brief AMU prep notes and proportionate investigation summaries support accountability."},
  {"title":"Escalate legal doubt early","description":"Involve HR, BHT, or counsel before irreversible steps."}
]}
$c15$::jsonb),

-- 16: Checklist
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 17, 'checklist', $c16$
{"items":[
  {"id":"k1","label":"I know where our HSE system and risk assessments are stored."},
  {"id":"k2","label":"I know our verneombud and AMU contacts (if any)."},
  {"id":"k3","label":"Employees know how to report HSE concerns and whistleblowing."},
  {"id":"k4","label":"Working hours and overtime follow law and agreements."},
  {"id":"k5","label":"We assess psychosocial factors when workload or organisation shifts."},
  {"id":"k6","label":"Safety reps are consulted on relevant changes before go-live."},
  {"id":"k7","label":"Harassment and violence risks are in our risk picture."},
  {"id":"k8","label":"Sick-leave follow-up follows procedure and privacy rules."},
  {"id":"k9","label":"I do not retaliate against lawful employee voices."},
  {"id":"k10","label":"Contractors receive HSE induction on our sites."}
]}
$c16$::jsonb),

-- 17: Reflection
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 18, 'reflection', $c17$
{"prompt":"Reflect: (1) What is the top psychosocial risk in your area today? (2) One concrete measure within 30 days? (3) Who must be consulted (verneombud, HR, AMU) before you act? Share outcomes with your manager or HR where appropriate."}
$c17$::jsonb),

-- 18: Short message
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 19, 'short_message', '{"message":"Sustainable compliance beats one-off campaigns — small visible improvements build trust over time."}'::jsonb),

-- 19: Final quiz — advanced formats
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 20, 'quiz', $c19$
{"passPercent":75,"questions":[
  {"id":"f1","question":"Harassment under the AML:","choices":[
    {"id":"a","label":"Can harm the psychosocial environment and must be addressed"},
    {"id":"b","label":"Is always a private matter between employees"},
    {"id":"c","label":"Should never involve leaders"}
  ],"correctChoiceId":"a"},
  {"id":"f2","question":"Internal control means:","choices":[
    {"id":"a","label":"A cycle of risk assessment, measures, verification, and documentation"},
    {"id":"b","label":"Only annual fire drills"},
    {"id":"c","label":"Delegating all HSE to staff"}
  ],"correctChoiceId":"a"},
  {"id":"f3","question":"Before major organisational change you should typically:","choices":[
    {"id":"a","label":"Inform and consult safety reps / AMU as required"},
    {"id":"b","label":"Announce only after implementation"},
    {"id":"c","label":"Avoid written records"}
  ],"correctChoiceId":"a"},
  {"id":"f4","question":"Dismissals under the AML require:","choices":[
    {"id":"a","label":"Objective justification and fair procedure"},
    {"id":"b","label":"No process if notice is paid"},
    {"id":"c","label":"Employee consent only"}
  ],"correctChoiceId":"a"},
  {"id":"f5","question":"The employer’s HSE responsibility is:","choices":[
    {"id":"a","label":"Non-delegable in substance — management remains accountable"},
    {"id":"b","label":"Fully transferred to the verneombud"},
    {"id":"c","label":"Optional for small companies"}
  ],"correctChoiceId":"a"},
  {"id":"f6","type":"matching","question":"Match roles","leftColumn":[
    {"id":"A","label":"BHT"},
    {"id":"B","label":"Arbeidstilsynet"}
  ],"rightColumn":[
    {"id":"X","label":"Occupational health support"},
    {"id":"Y","label":"Supervisory authority"}
  ],"correctPairs":[{"leftId":"A","rightId":"X"},{"leftId":"B","rightId":"Y"}]}
]}
$c19$::jsonb),

-- 20: Closing rich text
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 21, 'rich_text', $c20$
{"html":"<h2>Next steps</h2><p>You have worked through the main pillars: <strong>systematic HSE</strong>, physical and psychosocial risk, <strong>participation</strong>, working hours, change, and <strong>fair processes</strong>.</p><p>Use <em>Lovdata</em> and <em>Arbeidstilsynet</em> for authoritative texts. This module is <strong>training only</strong> — not legal advice.</p>"}
$c20$::jsonb),

-- 21: PDF (public sample PDF — replace with your AML guideline PDF URL)
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 22, 'pdf', $c21$
{"title":"PDF viewer demo (replace with Lovdata excerpt or internal guideline)","url":"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"}
$c21$::jsonb),

-- 22: SCORM / xAPI (launch URL when LMS hosts the package)
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 23, 'scorm_xapi', $c22$
{"packageType":"SCORM 1.2 or xAPI","launchUrl":"","notes":"Upload your SCORM/xAPI package to your LMS or storage and set launchUrl to the player entry point. xAPI statements should be sent to your LRS; wire the player in a future integration."}
$c22$::jsonb),

-- 23: H5P (public H5P.org embed — replace with your content)
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 24, 'h5p', $c24$
{"title":"Interactive content (H5P)","embedUrl":"https://h5p.org/h5p/embed/714"}
$c24$::jsonb),

-- 24: Assignment
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 25, 'assignment', $c25$
{"title":"Capstone: local compliance snapshot","instructions":"Submit a one-page note (upload when enabled) covering: (1) Where your written HSE system lives; (2) Last date of risk assessment for your team’s main hazards; (3) Name of verneombud or how employees reach HSE; (4) One improvement you will propose this quarter. Your HR or HSE function may give feedback.","acceptUpload":true}
$c25$::jsonb),

-- 25: Forum
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 26, 'forum', $c26$
{"headline":"Discuss: what AML topic is most challenging in your workplace?"}
$c26$::jsonb);

commit;
