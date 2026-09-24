export const WEEKLY_DIGEST_TRANSLATIONS = {
  es: {
    title: "Resumen Semanal de Métricas",
    desc: "Reporte estratégico enviado todos los lunes a las 08:00 AM con rol de jefe tradicional, tendencias web/sociales y tareas operativas.",
    titleSettings: "Resumen Semanal de Métricas",
    nicheLabel: "Niche / Sector del Cliente:",
    newsSourcesLabel: "News Sources (Fuentes de Noticias):",
    addCustomSourceBtn: "+ Add Custom Website",
    customSourceNameLabel: "Website Name:",
    customSourceUrlLabel: "Website URL:",
    topicsLabel: "Topics & Keywords (Temas y Palabras Clave):",
    customKeywordsLabel: "Custom Keywords (comma separated):",
    regionLabel: "Region:",
    userNameLabel: "Nombre del Usuario / Destinatario:",
    nichePlaceholder: "Selecciona o ingresa tu nicho...",
    notionTitle: "Notion Integration (CRM/Tareas):",
    notionTokenLabel: "Notion Token (secret_...):",
    notionDbLabel: "Notion Database ID:",
    trelloTitle: "Trello Integration (Opcional):",
    trelloKeyLabel: "Trello Key:",
    trelloTokenLabel: "Trello Token:",
    trelloBoardLabel: "Trello Board ID:",
    langLabel: "Idioma de Salida del Reporte:",
    scheduleTitle: "Frecuencia de Envío (Programador)",
    scheduleDesc: "Activar el envío automático todos los lunes en la mañana.",
    timeLabel: "Hora de Envío (Lunes):",
    saveButton: "Guardar Configuración",
    savingButton: "Guardando...",
    saveSuccess: "Configuración del Weekly Digest guardada con éxito.",
    saveError: "Error al guardar la configuración.",
    connectionsTitle: "🔌 Conexión de Google",
    googleLabel: "Cuenta de Google (Gmail, Sheets y Calendar):",
    connectButton: "Conectar Cuenta de Google",
    connectedBadge: "Conectado",
    disconnectedBadge: "Desconectado",
    helpTitle: "📘 Guía de Configuración Rápida",
    helpNotionTitle: "Configuración de Notion:",
    helpNotionStep1: "1. Ve a Notion Integrations (https://www.notion.so/my-integrations) y crea una integración interna para obtener tu Notion Token.",
    helpNotionStep2: "2. Abre tu base de datos en Notion, haz clic en los 3 puntos (...) y agrega la integración en la sección de conexiones.",
    helpNotionStep3: "3. El ID de la base de datos es la cadena de 32 caracteres que aparece en la URL después de tu espacio de trabajo (antes del signo de interrogación '?').",
    helpTrelloTitle: "Configuración de Trello (Opcional):",
    helpTrelloStep1: "1. Genera tu Key y Token de desarrollador desde https://trello.com/power-ups/admin.",
    helpTrelloStep2: "2. El ID del tablero es el código de 8 caracteres en la URL del tablero.",
    helpGoogleTitle: "Configuración de Google Calendar/Sheets:",
    helpGoogleStep1: "1. Haz clic en 'Conectar Cuenta de Google' para iniciar sesión y autorizar permisos.",
    helpGoogleStep2: "2. Esto generará el token de acceso para leer llamadas y hojas en el Weekly Digest.",
    helpGoogleStep3: "3. Si activas Google Sheets, asegúrate de pegar el ID del documento. El ID es la cadena larga que aparece en la URL del navegador entre '/d/' y '/edit'.",
    useGoogleCalendarLabel: "Buscar llamadas en Google Calendar",
    useGoogleSheetsLabel: "Buscar tareas/datos en Google Sheets",
    googleSheetsIdLabel: "Google Sheets Document ID:",
    googleSheetsIdPlaceholder: "ID de la hoja de cálculo de Google Sheets...",
    consoleTitle: "Consola de Ejecución",
    runBtn: "Ejecutar Reporte Semanal",
    runningBtn: "Generando Reporte...",
    statusRunning: "Analizando tendencias e integraciones...",
    statusReady: "Esperando inicialización...",
    statusDone: "Reporte generado y enviado a WhatsApp.",
    statusError: "Error en la ejecución.",
    feedbackTitle: "Calibración y Feedback",
    feedbackDesc: "Califica la relevancia del último reporte semanal para que la IA aprenda a refinar el tono, las tendencias y las prioridades operativas.",
    ratingLabel: "Calificación de Relevancia:",
    commentPlaceholder: "Escribe qué debe cambiar o mejorar (ej: 'demasiado estricto', 'agregar más contexto de Notion', 'excelente tono')...",
    submitFeedback: "Enviar Feedback",
    feedbackSuccess: "Calibración registrada con éxito. La IA ajustará el próximo reporte.",
    feedbackHistoryTitle: "Historial de Calibraciones Recientes",
    noFeedback: "Aún no se han registrado calibraciones.",
    stars: "estrellas"
  },
  en: {
    title: "Weekly Performance Digest",
    desc: "Strategic report sent every Monday at 08:00 AM adopting a traditional boss persona, web/social trends, and operational tasks.",
    titleSettings: "Weekly Performance Digest",
    nicheLabel: "Client Niche / Sector:",
    newsSourcesLabel: "News Sources:",
    addCustomSourceBtn: "+ Add Custom Website",
    customSourceNameLabel: "Website Name:",
    customSourceUrlLabel: "Website URL:",
    topicsLabel: "Topics & Keywords:",
    customKeywordsLabel: "Custom Keywords (comma separated):",
    regionLabel: "Region:",
    userNameLabel: "User Name / Recipient:",
    nichePlaceholder: "Select or input your niche...",
    notionTitle: "Notion Integration (CRM/Tasks):",
    notionTokenLabel: "Notion Token (secret_...):",
    notionDbLabel: "Notion Database ID:",
    trelloTitle: "Trello Integration (Optional):",
    trelloKeyLabel: "Trello Key:",
    trelloTokenLabel: "Trello Token:",
    trelloBoardLabel: "Trello Board ID:",
    langLabel: "Report Output Language:",
    scheduleTitle: "Send Schedule (Weekly Scheduler)",
    scheduleDesc: "Enable automatic sending every Monday morning.",
    timeLabel: "Send Time (Monday):",
    saveButton: "Save Configuration",
    savingButton: "Saving...",
    saveSuccess: "Weekly Digest settings saved successfully.",
    saveError: "Error saving settings.",
    connectionsTitle: "🔌 Google Connection",
    googleLabel: "Google Account (Gmail, Sheets & Calendar):",
    connectButton: "Connect Google Account",
    connectedBadge: "Connected",
    disconnectedBadge: "Disconnected",
    helpTitle: "📘 Quick Configuration Guide",
    helpNotionTitle: "Notion Setup:",
    helpNotionStep1: "1. Create a Notion integration to get your token from https://www.notion.so/my-integrations.",
    helpNotionStep2: "2. Share your tasks database with the integration inside Notion.",
    helpNotionStep3: "3. The Database ID is the 32-character code in the URL after your workspace name.",
    helpTrelloTitle: "Trello Setup (Optional):",
    helpTrelloStep1: "1. Generate your developer Key & Token from https://trello.com/power-ups/admin.",
    helpTrelloStep2: "2. The Board ID is the 8-character code in your Trello board URL.",
    helpGoogleTitle: "Google Calendar/Sheets Connection:",
    helpGoogleStep1: "1. Click 'Connect Google Account' to grant read access to your Google Calendar.",
    helpGoogleStep2: "2. This allows the agent to pull your weekly calls to structure the report.",
    helpGoogleStep3: "3. If you enable Google Sheets, make sure to paste the Document ID. The ID is the long string in your browser's URL between '/d/' and '/edit'.",
    useGoogleCalendarLabel: "Search calls in Google Calendar",
    useGoogleSheetsLabel: "Search tasks/data in Google Sheets",
    googleSheetsIdLabel: "Google Sheets Document ID:",
    googleSheetsIdPlaceholder: "Google Sheets spreadsheet ID...",
    consoleTitle: "Execution Console",
    runBtn: "Generate Weekly Report",
    runningBtn: "Generating Report...",
    statusRunning: "Analyzing trends and integrations...",
    statusReady: "Waiting for execution...",
    statusDone: "Report generated and sent to WhatsApp.",
    statusError: "Execution error.",
    feedbackTitle: "Calibration & Feedback",
    feedbackDesc: "Rate the relevance of the last weekly report so the AI learns to refine tone, trends, and operational priorities.",
    ratingLabel: "Relevance Rating:",
    commentPlaceholder: "Describe what needs to change or improve (e.g. 'too strict', 'add more Notion context', 'great tone')...",
    submitFeedback: "Submit Feedback",
    feedbackSuccess: "Calibration registered successfully. The AI will adjust the next report.",
    feedbackHistoryTitle: "Recent Calibration History",
    noFeedback: "No calibrations registered yet.",
    stars: "stars"
  }
};

export const CREDENTIALS_TRANSLATIONS = {
  en: {
    title: 'Security Vault',
    subtitle: 'Connect your clients\' tools securely. All keys are saved with military-grade encryption (AES-256).',
    step_1: '1. Select a Client (Tenant)',
    select_default: '-- Select Client --',
    mod_a: 'Module A: CRM, Email & Capture',
    crms: 'CRMs (HubSpot / GoHighLevel / Salesforce / Pipedrive / Keap / Notion)',
    emails: 'Email Marketing (ActiveCampaign / Mailchimp / ConvertKit / Klaviyo / SendGrid)',
    forms: 'Forms (Typeform / Tally.so / Jotform / Google Forms)',
    mod_b: 'Module B: Payments & Invoicing',
    gateways: 'Gateways (Stripe / PayPal / Hotmart / ThriveCart / Razorpay / MercadoPago)',
    invoicing: 'Invoicing (Quaderno / TaxJar / Holded / FacturaDirecta / QuickBooks / Xero)',
    mod_c: 'Module C: Operations & Delivery',
    portals: 'Portals (Kajabi / Skool / Hotmart Club / WordPress / Notion)',
    support: 'Support Communications (Zendesk / Intercom / WhatsApp API)',
    placeholder_key: 'Paste API Key here...',
    placeholder_secret: 'Paste Webhook Secret here...',
    placeholder_url: 'Paste API Key or Webhook URL here...',
    placeholder_whatsapp: 'e.g. 14155552671',
    alert_success: 'Key for {provider} saved and encrypted successfully.',
    alert_error: 'Error saving the key.',
    loading: 'Loading clients...',
    no_client_selected: 'Please select a client above to configure their integrations.',
    mod_ai: 'Module AI: Artificial Intelligence',
    mod_d: 'Module D: Agent Identity',
    google_oauth: 'Google OAuth (Gmail / Calendar / Drive)',
    placeholder_google: 'Paste Google Client Secret here...',
    whatsapp_num: 'WhatsApp Number (Notifications & Summaries)',
    zero_knowledge_banner: 'For your protection, once you save an API Key, it will be encrypted and locked instantly. It will never be displayed in plain text again for security reasons. If you need to update it, simply paste the new key over it.',
    google_cal: 'Google Calendar (Meetings / Briefing)',
    google_mail: 'Google Mail / Gmail (Read access)',
    google_drive: 'Google Drive & Sheets (Base Docs)',
    connected: 'Connected',
    not_connected: 'Not connected',
    btn_connect_cal: 'Connect Google Calendar',
    btn_connect_mail: 'Connect Gmail',
    btn_connect_drive: 'Connect Drive/Sheets',
  },
  es: {
    title: 'Security Vault',
    subtitle: 'Conecta las herramientas de tus clientes de forma segura. Todas las llaves se guardarán encriptadas en grado militar (AES-256).',
    step_1: '1. Selecciona un Cliente (Tenant)',
    select_default: '-- Selecciona Cliente --',
    mod_a: 'Módulo A: CRM, Correos & Captación',
    crms: 'CRMs (HubSpot / GoHighLevel / Salesforce / Pipedrive / Keap / Notion)',
    emails: 'Email Marketing (ActiveCampaign / Mailchimp / ConvertKit / Klaviyo / SendGrid)',
    forms: 'Formularios (Typeform / Tally.so / Jotform / Google Forms)',
    mod_b: 'Módulo B: Pagos y Facturación',
    gateways: 'Pasarelas (Stripe / PayPal / Hotmart / ThriveCart / Razorpay / MercadoPago)',
    invoicing: 'Facturación (Quaderno / TaxJar / Holded / FacturaDirecta / QuickBooks / Xero)',
    mod_c: 'Módulo C: Operaciones y Delivery',
    portals: 'Portals (Kajabi / Skool / Hotmart Club / WordPress / Notion)',
    support: 'Comunicaciones de Soporte (Zendesk / Intercom / WhatsApp API)',
    placeholder_key: 'Pegar API Key aquí...',
    placeholder_secret: 'Pegar Token/Webhook Secret aquí...',
    placeholder_url: 'Pegar API Key o Webhook URL aquí...',
    placeholder_whatsapp: 'Ej. 34600123456',
    alert_success: 'Llave de {provider} guardada y encriptada con éxito.',
    alert_error: 'Error guardando la llave.',
    loading: 'Cargando clientes...',
    no_client_selected: 'Por favor selecciona un cliente arriba para configurar sus integraciones.',
    mod_ai: 'Módulo AI: Inteligencia Artificial',
    mod_d: 'Módulo D: Identidad de Agentes',
    google_oauth: 'Google OAuth (Gmail / Calendar / Drive)',
    placeholder_google: 'Pegar Client Secret de Google aquí...',
    whatsapp_num: 'Número de WhatsApp (Notificaciones y Resúmenes)',
    zero_knowledge_banner: 'Para tu máxima protección, una vez que guardes una API Key, será cifrada y bloqueada al instante. Jamás volverá a mostrarse en texto plano por seguridad. Si necesitas actualizarla, simplemente pega la nueva llave encima.',
    google_cal: 'Google Calendar (Reuniones / Briefing)',
    google_mail: 'Google Mail / Gmail (Lectura)',
    google_drive: 'Google Drive & Sheets (Docs Base)',
    connected: 'Conectado',
    not_connected: 'No conectado',
    btn_connect_cal: 'Conectar Google Calendar',
    btn_connect_mail: 'Conectar Gmail',
    btn_connect_drive: 'Conectar Drive/Sheets',
  }
};

export const LEGAL_CONTENT = {
  en: {
    terms_title: 'Terms & Conditions',
    privacy_title: 'Privacy Policy',
    close: 'Close',
    last_updated: 'Last updated: June 16, 2026',
    
    terms_paragraphs: [
      {
        title: '1. Acceptance of Terms',
        text: 'By accessing or using the CoachData Media SaaS Suite (the "Platform"), you agree to be bound by these Terms and Conditions. If you do not agree, you must immediately cease using the Platform.'
      },
      {
        title: '2. Who We Are',
        text: 'The Platform is operated by CoachData Media. For questions or notices regarding these Terms, you may contact us at info@coachdata.example.'
      },
      {
        title: '3. Description of Service',
        text: 'The Platform provides an integrated environment for AI-powered autonomous agents (including but not limited to Prospect Analyzer, Email Organizer, Mail Responder, Pre-Call Agent, Weekly Digest, and Agency Memory). These agents automate business operations, calendar synchronization, email responses, and data analysis using third-party API integrations and Large Language Models (LLMs).'
      },
      {
        title: '4. Eligibility',
        text: 'You must be at least 18 years of age and legally capable of entering a binding contract in your jurisdiction to use the Platform. By registering, you represent that you meet these requirements.'
      },
      {
        title: '5. Subscription, Payments, and Refunds',
        text: 'Access to the Platform requires a paid subscription. Fees are charged in advance and are non-refundable except where required by applicable law. Where you are a consumer in the EU or UK purchasing digital services, you acknowledge that by accessing the Platform immediately upon purchase you request that the service begins during the statutory withdrawal period, and you may lose any right of withdrawal once the service has been fully provided. We may change pricing on 30 days\' notice, with changes taking effect at your next renewal.'
      },
      {
        title: '6. API Keys & Third-Party Integrations',
        text: 'To operate the agents, you may be required to provide API keys and authorize integrations (for example Google OAuth, Anthropic, OpenAI, and Stripe). You retain full ownership of these integrations. The Platform encrypts and securely stores these credentials solely to execute the autonomous operations you request. You are responsible for complying with the terms of any third-party service you connect. Certain features depend on third-party providers, including Google, OpenAI, Anthropic, Stripe, and other integrations. We do not control and are not responsible for the availability, performance, pricing, or policies of such services.'
      },
      {
        title: '7. Acceptable Use',
        text: 'You agree not to use the Platform to: send unsolicited bulk or spam communications; scrape, harvest, or process personal data without a lawful basis; violate any anti-spam, data protection, or marketing law, including the GDPR, UK GDPR, PECR, and CAN-SPAM; impersonate any person or entity; infringe intellectual property rights; or attempt to disrupt, reverse engineer, or gain unauthorized access to the Platform. You are solely responsible for the lawfulness of all data you input, scrape, or transmit, and for all messages the agents send on your behalf.'
      },
      {
        title: '8. Your Data and Responsibilities',
        text: 'For data you process about your own contacts, leads, and recipients through the Platform, you act as the data controller and we act as your data processor, as described in our Privacy Policy. You are responsible for having a lawful basis to collect and process that data and for honoring the rights of the individuals it concerns.'
      },
      {
        title: '9. Intellectual Property',
        text: 'The Platform, including its software, design, branding, and underlying systems, is owned by CoachData Media and protected by intellectual property law. We grant you a limited, non-exclusive, non-transferable right to use the Platform during your subscription. You retain ownership of the content and data you input, and of the outputs generated specifically for you, subject to your responsibility for how you use them.'
      },
      {
        title: '10. AI Outputs and Limitation of Liability',
        text: 'The AI agents generate autonomous reports, email drafts, and business insights probabilistically. AI-generated outputs may be incomplete, inaccurate, outdated, biased, or otherwise unsuitable for your intended purpose. You are ultimately responsible for reviewing and validating all agent actions before relying on or sending them. The Platform does not provide legal, tax, accounting, investment, financial, medical, employment, or other professional advice. To the maximum extent permitted by law, our total aggregate liability shall not exceed the total fees you paid to us in the twelve (12) months preceding the event giving rise to the claim.'
      },
      {
        title: '11. Warranty Disclaimer',
        text: 'The Platform is provided on an "as is" and "as available" basis. We do not warrant that the Platform will be uninterrupted or error-free. We disclaim all implied warranties to the maximum extent permitted by law.'
      },
      {
        title: '12. Indemnification',
        text: 'You agree to indemnify and hold harmless CoachData Media against any claims, damages, or costs arising from your breach of these Terms, your misuse of the Platform, or your unlawful processing of personal data through the Platform.'
      },
      {
        title: '13. Suspension and Termination',
        text: 'You may terminate your account at any time. We may suspend or terminate your access if you breach these Terms, fail to pay fees, or use the Platform unlawfully. On termination, your right to use the Platform ends immediately, subject to the data retention and deletion terms below.'
      },
      {
        title: '14. Account Deletion',
        text: 'You may delete your account at any time from your Profile. We will make commercially reasonable efforts to delete or anonymize your operational data, credentials, contacts, and agent histories from our production systems within 30 days. Residual copies may persist in encrypted backups for up to 90 days before being overwritten. We retain transaction and billing records for the period required by applicable tax and accounting law. This action is otherwise irreversible.'
      },
      {
        title: '15. RAG (Retrieval-Augmented Generation) System',
        text: 'The Platform uses a Retrieval-Augmented Generation (RAG) system to feed the memory of some AI agents. This allows you to upload documents, which may contain sensitive information, in the Agency Memory section. All uploaded documents are stored encrypted at rest. When you delete your account, RAG documents associated with your tenant are removed in accordance with the deletion timeline described in Section 14.'
      },
      {
        title: '16. Beta Features',
        text: 'From time to time, we may offer beta, preview, or experimental features. Such features are provided on an "as is" basis and may be modified, suspended, or withdrawn at any time without liability.'
      },
      {
        title: '17. Force Majeure',
        text: 'We are not liable for delays or interruptions caused by events beyond our reasonable control, including internet outages, cyberattacks, acts of God, governmental actions, or failures of third-party providers and infrastructure.'
      },
      {
        title: '18. Modifications to Terms',
        text: 'We may update these Terms as we introduce new features, agents, or legal requirements. We will notify you of material changes. Continued use of the Platform after changes take effect constitutes acceptance.'
      },
      {
        title: '19. Governing Law and Jurisdiction',
        text: 'These Terms are governed by the laws of Spain, and any disputes shall be subject to the exclusive jurisdiction of the courts of Alicante, Spain, without prejudice to any mandatory consumer protections available to you.'
      },
      {
        title: '20. Severability & Entire Agreement',
        text: 'If any provision of these Terms is held invalid or unenforceable, the remaining provisions shall remain in full force. These Terms, together with our Privacy Policy and Data Processing Agreement, constitute the entire agreement between you and CoachData Media. Questions about these Terms can be sent to: info@coachdata.example'
      }
    ],
    
    privacy_paragraphs: [
      {
        title: '1. Who We Are (Data Controller)',
        text: 'This Platform is operated by CoachData Media ("CoachData Media", "we", "us", or "our"). For privacy matters, you may contact us at info@coachdata.example. For your account and billing data, we act as the data controller. For data you process about your own contacts and leads through the Platform, you act as the controller and we act as your processor.'
      },
      {
        title: '2. Information We Collect',
        text: 'We collect your profile information (such as your name, email address, and organization), encrypted API credentials required to run integrations, operational leads and contacts generated or imported through the Platform, documents you upload to Agency Memory, and transaction metadata. We do not inspect or store the contents of your communications beyond what is reasonably necessary to perform the AI agent tasks you request.'
      },
      {
        title: '3. Legal Basis for Processing',
        text: 'We process personal data on the following lawful bases under the GDPR: (a) Performance of our contract with you, in order to provide the Platform and execute the agent tasks you request; (b) Your consent, where you connect third-party accounts such as Google; (c) Our legitimate interests, including securing, maintaining, improving, and developing the Platform; and (d) Compliance with legal obligations, including tax, accounting, and regulatory requirements.'
      },
      {
        title: '4. How We Use Your Data',
        text: 'We use your data to operate and secure the Platform, execute the agent tasks you request, process payments, provide customer support, improve the Platform, and comply with our legal obligations. We do not sell your personal data or share personal data for advertising purposes.'
      },
      {
        title: '5. Use of Google User Data (Limited Use)',
        text: 'When you link your Google Account, the Platform may request permission to read and write Google Calendar events and to read, modify, and draft Gmail messages. These permissions are used strictly to enable Briefing synchronization, Pre-Call meeting preparation, and Mail Responder draft features at your request. CoachData Media\'s use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. We do not use Google user data to develop, improve, or train generalized AI or machine learning models. We do not allow humans to read your Google user data unless you provide explicit consent or it is required by law.'
      },
      {
        title: '6. Data You Collect About Third Parties',
        text: 'Certain features, including Prospect Analyzer, may collect personal data about third parties, such as publicly available business contact information. When using these features, you act as the data controller for that information and are responsible for having a lawful basis to collect and process it, honoring data subject requests, and complying with applicable privacy and anti-spam laws. We process such information solely on your instructions as your processor.'
      },
      {
        title: '7. Data Security & Encryption',
        text: 'Your sensitive credentials and uploaded documents are encrypted at rest. Database access is restricted using Row-Level Security (RLS), ensuring that users may only access their own tenant data. We implement appropriate technical and organizational measures designed to protect personal data. Where required by law, we will notify affected users and the relevant supervisory authority in the event of a personal data breach.'
      },
      {
        title: '8. Subprocessors, AI Providers & International Transfers',
        text: 'To generate insights and drafts and to operate the Platform, relevant data fragments may be transmitted to AI and infrastructure providers, including OpenAI, Anthropic, Google, Stripe, Supabase, and our hosting providers. Some of these providers are located outside the European Economic Area, including the United States. Where personal data is transferred internationally, we rely on appropriate safeguards under the GDPR, including the European Commission\'s Standard Contractual Clauses. These providers are contractually prohibited from using your business data to train their public models.'
      },
      {
        title: '9. RAG (Retrieval-Augmented Generation) Data Protection',
        text: 'Certain AI agents use a Retrieval-Augmented Generation (RAG) system. Documents uploaded to Agency Memory, including documents containing sensitive information, are encrypted at rest and are used solely to provide the requested functionality. Deleting your account triggers deletion of all RAG documents associated with your tenant in accordance with the retention periods described below.'
      },
      {
        title: '10. Data Retention and Deletion',
        text: 'We retain personal data only for as long as necessary to provide the Platform and fulfill the purposes described in this Policy, or as otherwise required by law. When you delete your account, we make commercially reasonable efforts to delete or anonymize your operational data, credentials, contacts, and RAG documents from our production systems within thirty (30) days. Residual copies may persist in encrypted backups for up to ninety (90) days before being automatically overwritten. Transaction and billing records may be retained for the period required by applicable tax, accounting, and legal obligations.'
      },
      {
        title: '11. Your Rights',
        text: 'Under the GDPR, you have the right to: access your personal data; correct inaccurate personal data; request deletion of your personal data; restrict or object to processing; request data portability; and withdraw consent at any time where processing relies on consent. You may exercise most of these rights through your Profile or by contacting info@coachdata.example. In Spain, the relevant supervisory authority is the Agencia Española de Protección de Datos (AEPD).'
      },
      {
        title: '12. Cookies and Tracking',
        text: 'The Platform and our website may use cookies and similar technologies for authentication, security, and analytics purposes. For additional information regarding cookies and how to manage them, please refer to our Cookie Policy.'
      },
      {
        title: '13. Children',
        text: 'The Platform is not intended for individuals under the age of 18, and we do not knowingly collect personal data from children.'
      },
      {
        title: '14. Changes to This Policy',
        text: 'We may update this Privacy Policy from time to time as the Platform evolves. Where required by law, we will notify users of material changes. The "Last updated" date above reflects the latest version of this Policy.'
      },
      {
        title: '15. Contact and Complaints',
        text: 'For privacy questions or to exercise your rights, please contact: CoachData Media — info@coachdata.example. If you are not satisfied with our response, you may contact the Agencia Española de Protección de Datos (AEPD) or your local supervisory authority.'
      }
    ]
  },
  es: {
    terms_title: 'Términos y Condiciones',
    privacy_title: 'Política de Privacidad',
    close: 'Cerrar',
    last_updated: 'Última actualización: 16 de junio de 2026',
    
    terms_paragraphs: [
      {
        title: '1. Aceptación de los Términos',
        text: 'Al acceder o utilizar CoachData Media SaaS Suite (la "Plataforma"), aceptas estar sujeto a estos Términos y Condiciones. Si no estás de acuerdo, debes dejar de usar la plataforma de inmediato.'
      },
      {
        title: '2. Quiénes Somos',
        text: 'La Plataforma es operada por CoachData Media. Para preguntas o notificaciones relacionadas con estos Términos, puedes contactarnos en info@coachdata.example.'
      },
      {
        title: '3. Descripción del Servicio',
        text: 'La Plataforma proporciona un entorno integrado de agentes autónomos impulsados por Inteligencia Artificial (incluyendo Prospect Analyzer, Email Organizer, Mail Responder, Pre-Call Agent, Weekly Digest y Memoria de la Agencia). Estos agentes automatizan operaciones comerciales, sincronización de calendarios, respuestas de correo e investigación usando integraciones de terceros y modelos de lenguaje (LLMs).'
      },
      {
        title: '4. Elegibilidad',
        text: 'Debes tener al menos 18 años y ser legalmente capaz de celebrar un contrato vinculante en tu jurisdicción para usar la Plataforma. Al registrarte, declaras que cumples estos requisitos.'
      },
      {
        title: '5. Suscripción, Pagos y Reembolsos',
        text: 'El acceso a la Plataforma requiere una suscripción de pago. Las tarifas se cobran por adelantado y no son reembolsables, salvo cuando lo exija la ley aplicable. Si eres consumidor en la UE o el Reino Unido, al acceder a la Plataforma inmediatamente tras la compra reconoces que solicitas el inicio del servicio durante el período de desistimiento legal, y puedes perder tu derecho de desistimiento una vez prestado el servicio completo. Podemos modificar precios con 30 días de antelación, siendo efectivo el cambio en tu próxima renovación.'
      },
      {
        title: '6. Credenciales de Integración (API Keys)',
        text: 'Para el correcto funcionamiento de los agentes, puede requerirse que proveas llaves de API y autorices integraciones (ej. Google OAuth, Anthropic, OpenAI, Stripe). Conservas la propiedad total de estas integraciones. La Plataforma cifra y almacena de forma segura estas credenciales únicamente para ejecutar las operaciones autónomas que solicitas. Eres responsable de cumplir los términos de cualquier servicio de terceros que conectes. Algunas funciones dependen de proveedores externos (Google, OpenAI, Anthropic, Stripe u otros). No controlamos ni somos responsables de la disponibilidad, rendimiento, precios o políticas de dichos servicios.'
      },
      {
        title: '7. Uso Aceptable',
        text: 'Aceptas no usar la Plataforma para: enviar comunicaciones masivas no solicitadas o spam; recopilar o procesar datos personales sin base legal; infringir normativas anti-spam, protección de datos o marketing como el RGPD, la PECR o el CAN-SPAM; suplantar la identidad de personas o entidades; vulnerar derechos de propiedad intelectual; ni intentar interrumpir, hacer ingeniería inversa o acceder sin autorización a la Plataforma. Eres el único responsable de la legalidad de los datos que introduces, recopilas o transmites, y de todos los mensajes que los agentes envían en tu nombre.'
      },
      {
        title: '8. Tus Datos y Responsabilidades',
        text: 'Para los datos que procesas sobre tus propios contactos, leads y destinatarios a través de la Plataforma, actúas como responsable del tratamiento y nosotros como encargado del tratamiento, según se describe en nuestra Política de Privacidad. Eres responsable de tener una base legal para recopilar y tratar esos datos y de respetar los derechos de las personas afectadas.'
      },
      {
        title: '9. Propiedad Intelectual',
        text: 'La Plataforma, incluyendo su software, diseño, marca y sistemas subyacentes, es propiedad de CoachData Media y está protegida por la legislación de propiedad intelectual. Te concedemos un derecho limitado, no exclusivo e intransferible para usar la Plataforma durante tu suscripción. Conservas la propiedad del contenido y datos que introduces, y de los resultados generados específicamente para ti, sujeto a tu responsabilidad por el uso que hagas de ellos.'
      },
      {
        title: '10. Resultados de la IA y Limitación de Responsabilidad',
        text: 'Los agentes de IA generan informes, borradores de correo y análisis comerciales de forma probabilística. Los resultados pueden ser incompletos, inexactos, desactualizados o no adecuados para tu propósito. Eres el responsable final de revisar y validar todas las acciones de los agentes antes de usarlos o enviarlos. La Plataforma no ofrece asesoramiento legal, fiscal, contable, de inversión, financiero, médico, laboral ni de ningún otro tipo profesional. En la máxima medida permitida por la ley, nuestra responsabilidad agregada total no superará las tarifas totales que nos abonaste en los doce (12) meses anteriores al hecho generador.'
      },
      {
        title: '11. Exclusión de Garantías',
        text: 'La Plataforma se proporciona "tal cual" y "según disponibilidad". No garantizamos que la Plataforma sea ininterrumpida ni libre de errores. Excluimos todas las garantías implícitas en la máxima medida permitida por la ley.'
      },
      {
        title: '12. Indemnización',
        text: 'Aceptas indemnizar y eximir de responsabilidad a CoachData Media frente a cualquier reclamación, daño o coste derivado de tu incumplimiento de estos Términos, el uso indebido de la Plataforma o el tratamiento ilícito de datos personales a través de ella.'
      },
      {
        title: '13. Suspensión y Resolución',
        text: 'Puedes cancelar tu cuenta en cualquier momento. Podemos suspender o dar de baja tu acceso si incumples estos Términos, no abonas las tarifas o usas la Plataforma de forma ilegal. Tras la resolución, tu derecho a usar la Plataforma cesa de inmediato, sujeto a los plazos de retención y eliminación de datos descritos a continuación.'
      },
      {
        title: '14. Eliminación de Cuenta',
        text: 'Puedes eliminar tu cuenta en cualquier momento desde tu Perfil. Haremos esfuerzos comercialmente razonables para eliminar o anonimizar tus datos operativos, credenciales, contactos e historial de agentes de nuestros sistemas de producción en 30 días. Las copias residuales pueden persistir en copias de seguridad cifradas hasta 90 días antes de ser sobrescritas. Conservamos los registros de transacciones y facturación durante el período exigido por la legislación fiscal y contable aplicable. Esta acción es irreversible.'
      },
      {
        title: '15. Sistema RAG (Generación Aumentada por Recuperación)',
        text: 'La Plataforma utiliza un sistema RAG (Retrieval-Augmented Generation / Generación Aumentada por Recuperación) para alimentar la memoria de algunos agentes de IA. Esto permite subir documentos, que pueden contener información sensible, en la sección Memoria de la Agencia. Todos los documentos subidos están almacenados cifrados en reposo. Al eliminar tu cuenta, los documentos RAG asociados a tu tenant se eliminan conforme al cronograma descrito en el apartado 14.'
      },
      {
        title: '16. Funciones Beta',
        text: 'De forma ocasional, podemos ofrecer funciones beta, de vista previa o experimentales. Dichas funciones se proporcionan "tal cual" y pueden modificarse, suspenderse o retirarse en cualquier momento sin responsabilidad.'
      },
      {
        title: '17. Fuerza Mayor',
        text: 'No somos responsables de retrasos o interrupciones causados por eventos fuera de nuestro control razonable, incluyendo cortes de internet, ciberataques, causas de fuerza mayor, acciones gubernamentales o fallos de proveedores e infraestructuras de terceros.'
      },
      {
        title: '18. Modificaciones de los Términos',
        text: 'Podemos actualizar estos Términos conforme introducimos nuevas funciones, agentes o requisitos legales. Notificaremos los cambios materiales. El uso continuado de la Plataforma tras la entrada en vigor de los cambios constituye su aceptación.'
      },
      {
        title: '19. Ley Aplicable y Jurisdicción',
        text: 'Estos Términos se rigen por las leyes de España, y cualquier disputa estará sujeta a la jurisdicción exclusiva de los tribunales de Alicante, España, sin perjuicio de las protecciones de consumo obligatorias que te correspondan.'
      },
      {
        title: '20. Divisibilidad y Acuerdo Completo',
        text: 'Si alguna disposición de estos Términos se declara inválida o inaplicable, las restantes continuarán en plena vigencia. Estos Términos, junto con nuestra Política de Privacidad y el Acuerdo de Tratamiento de Datos, constituyen el acuerdo completo entre tú y CoachData Media. Para consultas sobre estos Términos: info@coachdata.example'
      }
    ],
    
    privacy_paragraphs: [
      {
        title: '1. Quiénes Somos (Responsable del Tratamiento)',
        text: 'La Plataforma es operada por CoachData Media ("CoachData Media", "nosotros", "nuestro"). Para cuestiones de privacidad, puedes contactarnos en info@coachdata.example. Para tus datos de cuenta y facturación, actuamos como responsable del tratamiento. Para los datos que procesas sobre tus propios contactos y leads a través de la Plataforma, tú actúas como responsable y nosotros como encargado del tratamiento.'
      },
      {
        title: '2. Información que Recopilamos',
        text: 'Recopilamos tu información de perfil (nombre, correo electrónico y organización), credenciales de API cifradas para las integraciones, contactos y leads operativos generados o importados a través de la Plataforma, documentos que subes a Memoria de la Agencia y metadatos de transacciones. No inspeccionamos ni guardamos el contenido de tus comunicaciones más allá de lo razonablemente necesario para ejecutar las tareas de los agentes que solicitas.'
      },
      {
        title: '3. Base Legal del Tratamiento',
        text: 'Tratamos datos personales en las siguientes bases legales bajo el RGPD: (a) Ejecución de nuestro contrato contigo para prestar la Plataforma y ejecutar las tareas de los agentes; (b) Tu consentimiento, cuando conectas cuentas de terceros como Google; (c) Nuestros intereses legítimos, incluyendo proteger, mantener, mejorar y desarrollar la Plataforma; y (d) Cumplimiento de obligaciones legales, incluidas las fiscales, contables y regulatorias.'
      },
      {
        title: '4. Cómo Usamos tus Datos',
        text: 'Usamos tus datos para operar y asegurar la Plataforma, ejecutar las tareas de los agentes que solicitas, procesar pagos, prestar soporte al cliente, mejorar la Plataforma y cumplir nuestras obligaciones legales. No vendemos tus datos personales ni los compartimos con fines publicitarios.'
      },
      {
        title: '5. Uso de Datos de Google (Uso Limitado)',
        text: 'Al vincular tu cuenta de Google, la Plataforma puede solicitar permiso para leer y escribir eventos en Google Calendar y para leer, modificar y redactar mensajes en Gmail. Estos permisos se usan exclusivamente para habilitar la sincronización del Briefing, la preparación de Pre-Call y las funciones de borrador del Mail Responder a tu solicitud. El uso y la transferencia de información recibida de las APIs de Google por parte de CoachData Media se ajusta a la Política de Datos de Usuarios de Servicios de la API de Google, incluyendo los requisitos de Uso Limitado. No usamos los datos de usuario de Google para desarrollar, mejorar o entrenar modelos de IA o aprendizaje automático de carácter general. No permitimos que personas accedan a tus datos de Google salvo con tu consentimiento explícito o cuando lo exija la ley.'
      },
      {
        title: '6. Datos que Recopilas sobre Terceros',
        text: 'Ciertas funciones, incluido el Prospect Analyzer, pueden recopilar datos personales sobre terceros, como información de contacto empresarial disponible públicamente. Al usar estas funciones, actúas como responsable del tratamiento de esa información y eres responsable de contar con una base legal para recopilarla y tratarla, de atender las solicitudes de los interesados y de cumplir las leyes aplicables de privacidad y anti-spam. Tratamos dicha información únicamente según tus instrucciones como encargado del tratamiento.'
      },
      {
        title: '7. Seguridad y Cifrado de Datos',
        text: 'Tus credenciales sensibles y los documentos subidos están cifrados en reposo. El acceso a la base de datos está restringido mediante políticas RLS (Row-Level Security), garantizando que los usuarios solo puedan acceder a los datos de su propio tenant. Implementamos medidas técnicas y organizativas apropiadas para proteger los datos personales. Cuando lo exija la ley, notificaremos a los usuarios afectados y a la autoridad supervisora competente en caso de brecha de seguridad de datos personales.'
      },
      {
        title: '8. Subencargados, Proveedores de IA y Transferencias Internacionales',
        text: 'Para generar análisis y borradores y operar la Plataforma, fragmentos relevantes de datos pueden transmitirse a proveedores de IA e infraestructura, incluyendo OpenAI, Anthropic, Google, Stripe, Supabase y nuestros proveedores de alojamiento. Algunos de estos proveedores se encuentran fuera del Espacio Económico Europeo, incluyendo Estados Unidos. Cuando los datos personales se transfieren internacionalmente, nos apoyamos en salvaguardas adecuadas conforme al RGPD, incluyendo las Cláusulas Contractuales Tipo de la Comisión Europea. Estos proveedores tienen contractualmente prohibido usar tus datos empresariales para entrenar sus modelos públicos.'
      },
      {
        title: '9. Protección de Datos en el Sistema RAG (Generación Aumentada por Recuperación)',
        text: 'Algunos agentes de IA utilizan un sistema RAG (Retrieval-Augmented Generation / Generación Aumentada por Recuperación). Los documentos subidos a Memoria de la Agencia, incluidos los que contienen información sensible, están cifrados en reposo y se usan exclusivamente para proporcionar la funcionalidad solicitada. La eliminación de tu cuenta activa la supresión de todos los documentos RAG asociados a tu tenant conforme a los plazos de retención descritos a continuación.'
      },
      {
        title: '10. Retención y Eliminación de Datos',
        text: 'Conservamos los datos personales solo durante el tiempo necesario para prestar la Plataforma y cumplir los fines descritos en esta Política, o según lo exija la ley. Al eliminar tu cuenta, haremos esfuerzos comercialmente razonables para suprimir o anonimizar tus datos operativos, credenciales, contactos y documentos RAG de nuestros sistemas de producción en treinta (30) días. Las copias residuales pueden persistir en copias de seguridad cifradas hasta noventa (90) días antes de ser sobrescritas automáticamente. Los registros de transacciones y facturación pueden conservarse durante el período exigido por las obligaciones fiscales, contables y legales aplicables.'
      },
      {
        title: '11. Tus Derechos',
        text: 'En virtud del RGPD, tienes derecho a: acceder a tus datos personales; corregir datos inexactos; solicitar la supresión de tus datos; limitar u oponerte al tratamiento; solicitar la portabilidad de datos; y retirar tu consentimiento en cualquier momento cuando el tratamiento se base en él. Puedes ejercer la mayoría de estos derechos desde tu Perfil o contactando a info@coachdata.example. En España, la autoridad supervisora es la Agencia Española de Protección de Datos (AEPD).'
      },
      {
        title: '12. Cookies y Rastreo',
        text: 'La Plataforma y nuestro sitio web pueden utilizar cookies y tecnologías similares con fines de autenticación, seguridad y analítica. Para más información sobre cookies y cómo gestionarlas, consulta nuestra Política de Cookies.'
      },
      {
        title: '13. Menores',
        text: 'La Plataforma no está destinada a personas menores de 18 años y no recopilamos conscientemente datos personales de niños.'
      },
      {
        title: '14. Cambios en esta Política',
        text: 'Podemos actualizar esta Política de Privacidad a medida que evolucione la Plataforma. Cuando lo exija la ley, notificaremos a los usuarios los cambios materiales. La fecha de "última actualización" refleja la versión vigente de esta Política.'
      },
      {
        title: '15. Contacto y Reclamaciones',
        text: 'Para consultas sobre privacidad o para ejercer tus derechos, contacta con: CoachData Media — info@coachdata.example. Si no estás satisfecho con nuestra respuesta, puedes contactar con la Agencia Española de Protección de Datos (AEPD) o la autoridad supervisora de tu país.'
      }
    ]
  }
};
