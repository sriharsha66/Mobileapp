export type LegalBlock =
  | { kind: 'heading';   text: string }
  | { kind: 'subhead';   text: string }
  | { kind: 'para';      text: string }
  | { kind: 'bullet';    text: string }
  | { kind: 'warning';   text: string }
  | { kind: 'divider' };

export type LegalDoc = {
  title: string;
  subtitle: string;
  lastUpdated: string;
  blocks: LegalBlock[];
};

// ─────────────────────────────────────────────────────────────
// TERMS & CONDITIONS
// Governing laws: Indian Contract Act 1872, IT Act 2000/2008,
// DPDPA 2023, Consumer Protection Act 2019, Arb. Act 1996
// ─────────────────────────────────────────────────────────────
export const TERMS: LegalDoc = {
  title: 'Terms & Conditions',
  subtitle: 'MedVault Personal Health Records App',
  lastUpdated: 'June 30, 2026',
  blocks: [
    { kind: 'para', text: 'Please read these Terms and Conditions ("Terms") carefully before using MedVault. By creating an account or using the App, you agree to be legally bound by these Terms under the Indian Contract Act, 1872 and the Information Technology Act, 2000 (as amended).' },

    { kind: 'divider' },
    { kind: 'heading', text: '1. Acceptance of Terms' },
    { kind: 'para', text: 'By accessing or using MedVault ("App", "Service", "We", "Us"), you ("User", "You") confirm that you have read, understood, and agree to these Terms. If you do not agree, do not use the App.' },

    { kind: 'divider' },
    { kind: 'heading', text: '2. Eligibility' },
    { kind: 'para', text: 'You must meet all of the following criteria to use MedVault:' },
    { kind: 'bullet', text: 'Be at least 18 years of age.' },
    { kind: 'bullet', text: 'Have the legal capacity to enter into a binding agreement.' },
    { kind: 'bullet', text: 'Not be prohibited from using the Service under any applicable law.' },
    { kind: 'bullet', text: 'Provide accurate and complete registration information.' },

    { kind: 'divider' },
    { kind: 'heading', text: '3. Description of Service' },
    { kind: 'para', text: 'MedVault is a personal digital health records management application that allows users to:' },
    { kind: 'bullet', text: 'Store, organise, and manage personal medical documents, reports, and images.' },
    { kind: 'bullet', text: 'Upload prescriptions, diagnostic reports, lab results, and health records.' },
    { kind: 'bullet', text: 'Export and share health records as PDF summaries.' },
    { kind: 'bullet', text: 'Set reminders for upcoming medical appointments and follow-ups.' },
    { kind: 'para', text: 'MedVault is a personal record storage tool only. It is not a healthcare provider, medical device, diagnostic service, telemedicine platform, or a regulated health system.' },

    { kind: 'divider' },
    { kind: 'heading', text: '4. Important Medical Disclaimer' },
    { kind: 'warning', text: '⚠️  MedVault does NOT provide medical advice, diagnosis, or treatment. This App is a digital storage tool for your existing health records ONLY.' },
    { kind: 'bullet', text: 'Do NOT rely on MedVault content for any medical decision.' },
    { kind: 'bullet', text: 'Always consult a qualified, registered medical practitioner for health concerns.' },
    { kind: 'bullet', text: 'In a medical emergency, call 112 (India) or your local emergency number immediately.' },
    { kind: 'bullet', text: 'MedVault does not review, verify, or authenticate medical records stored by users.' },
    { kind: 'bullet', text: 'Storing a document in MedVault does not constitute validation of its medical accuracy.' },

    { kind: 'divider' },
    { kind: 'heading', text: '5. User Account' },
    { kind: 'subhead', text: '5.1 Registration' },
    { kind: 'para', text: 'You must provide accurate, complete, and current information during registration. You are responsible for keeping your profile information updated.' },
    { kind: 'subhead', text: '5.2 Account Security' },
    { kind: 'para', text: 'You are solely responsible for maintaining the confidentiality of your account credentials. Notify us immediately at magnusharsha@gmail.com if you suspect any unauthorised access to your account.' },
    { kind: 'subhead', text: '5.3 One Account Per User' },
    { kind: 'para', text: 'Each user may maintain only one account. Creating multiple accounts is prohibited.' },
    { kind: 'subhead', text: '5.4 Account Termination' },
    { kind: 'para', text: 'You may delete your account at any time from the app settings. We may suspend or terminate your account for violations of these Terms without prior notice.' },

    { kind: 'divider' },
    { kind: 'heading', text: '6. User Responsibilities and Prohibited Activities' },
    { kind: 'para', text: 'You agree NOT to:' },
    { kind: 'bullet', text: 'Use the App for any unlawful purpose or in violation of any applicable law or regulation.' },
    { kind: 'bullet', text: 'Upload false, fabricated, fraudulent, or misleading medical records.' },
    { kind: 'bullet', text: 'Upload records belonging to another person without their explicit written consent.' },
    { kind: 'bullet', text: 'Impersonate any person, entity, or healthcare professional.' },
    { kind: 'bullet', text: 'Attempt to gain unauthorised access to the App, its servers, or any connected systems.' },
    { kind: 'bullet', text: 'Reverse-engineer, decompile, or attempt to extract source code from the App.' },
    { kind: 'bullet', text: 'Upload viruses, malware, or any harmful, disruptive, or malicious code.' },
    { kind: 'bullet', text: 'Use the App in any manner that could damage, disable, or impair the Service.' },
    { kind: 'bullet', text: 'Sell, trade, or otherwise transfer your account to another person.' },

    { kind: 'divider' },
    { kind: 'heading', text: '7. Intellectual Property' },
    { kind: 'para', text: 'The MedVault name, logo, design, user interface, and proprietary software are owned by the developer and are protected under applicable intellectual property laws.' },
    { kind: 'para', text: 'Users retain full ownership of all personal health data and documents they upload to the App. By uploading content, you grant MedVault a limited, non-exclusive, non-transferable, royalty-free licence solely to store, process, and display your content back to you as necessary to provide the Service.' },

    { kind: 'divider' },
    { kind: 'heading', text: '8. Privacy and Data Protection' },
    { kind: 'para', text: 'Your use of the App is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using MedVault, you consent to data practices as described in the Privacy Policy. The Privacy Policy complies with the Digital Personal Data Protection Act, 2023 (DPDPA 2023), India.' },

    { kind: 'divider' },
    { kind: 'heading', text: '9. Third-Party Services' },
    { kind: 'para', text: 'MedVault uses the following third-party infrastructure services:' },
    { kind: 'bullet', text: 'Amazon Web Services (AWS) — cloud server hosting and file storage.' },
    { kind: 'para', text: 'These service providers have their own terms of service and privacy policies. We are not responsible for their independent actions or policies.' },

    { kind: 'divider' },
    { kind: 'heading', text: '10. Limitation of Liability' },
    { kind: 'para', text: 'To the maximum extent permitted by applicable law, MedVault and its developer shall not be liable for:' },
    { kind: 'bullet', text: 'Any indirect, incidental, special, punitive, or consequential damages.' },
    { kind: 'bullet', text: 'Loss of data due to device failure, technical errors, or user negligence.' },
    { kind: 'bullet', text: 'Any damages arising from reliance on inaccurate or incomplete medical records stored in the App.' },
    { kind: 'bullet', text: 'Service interruption, downtime, or discontinuation.' },
    { kind: 'bullet', text: 'Unauthorised access to your account resulting from your failure to secure credentials.' },
    { kind: 'para', text: 'The total aggregate liability of MedVault to any user for any and all claims shall not exceed ₹1,000 (Indian Rupees One Thousand).' },

    { kind: 'divider' },
    { kind: 'heading', text: '11. Indemnification' },
    { kind: 'para', text: 'You agree to indemnify, defend, and hold harmless MedVault and its developer from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising from: (a) your use of or access to the App; (b) your violation of these Terms; (c) your violation of any applicable law or the rights of any third party.' },

    { kind: 'divider' },
    { kind: 'heading', text: '12. Termination' },
    { kind: 'para', text: 'Either party may terminate this agreement at any time. Upon termination, your right to access and use the App ceases immediately. Your stored data will be permanently deleted within 30 days of an account deletion request, except where retention is required by applicable law.' },

    { kind: 'divider' },
    { kind: 'heading', text: '13. Governing Law and Jurisdiction' },
    { kind: 'para', text: 'These Terms are governed by and construed in accordance with the laws of the Republic of India. Subject to the Dispute Resolution clause below, any disputes shall be subject to the exclusive jurisdiction of competent courts located in Hyderabad, Telangana, India.' },

    { kind: 'divider' },
    { kind: 'heading', text: '14. Dispute Resolution' },
    { kind: 'para', text: 'Any dispute, controversy, or claim arising out of or relating to these Terms, including their validity, breach, or termination, shall first be attempted to be resolved through good-faith negotiation.' },
    { kind: 'para', text: 'If unresolved within 30 days, the dispute shall be finally settled by arbitration in accordance with the Arbitration and Conciliation Act, 1996 (as amended). The seat of arbitration shall be Hyderabad, Telangana, India. The arbitration proceedings shall be conducted in the English language.' },

    { kind: 'divider' },
    { kind: 'heading', text: '15. Consumer Rights' },
    { kind: 'para', text: 'Nothing in these Terms limits or excludes your rights under the Consumer Protection Act, 2019, India. If you are a consumer within the meaning of that Act, you retain all rights available to you thereunder.' },

    { kind: 'divider' },
    { kind: 'heading', text: '16. Severability' },
    { kind: 'para', text: 'If any provision of these Terms is held to be invalid or unenforceable, that provision shall be modified to the minimum extent necessary, and the remaining provisions shall continue in full force and effect.' },

    { kind: 'divider' },
    { kind: 'heading', text: '17. Changes to Terms' },
    { kind: 'para', text: 'We reserve the right to modify these Terms at any time. We will notify you of material changes through the App or via email. Continued use of the App after such notification constitutes your acceptance of the revised Terms.' },

    { kind: 'divider' },
    { kind: 'heading', text: '18. Contact' },
    { kind: 'para', text: 'For any questions, concerns, or feedback regarding these Terms:' },
    { kind: 'bullet', text: 'Email: magnusharsha@gmail.com' },
    { kind: 'bullet', text: 'Response time: within 48 business hours.' },
  ],
};

// ─────────────────────────────────────────────────────────────
// PRIVACY POLICY
// Compliant with: DPDPA 2023, IT (SPDI) Rules 2011,
// IT Rules 2021, Consumer Protection Act 2019, GDPR (EU)
// ─────────────────────────────────────────────────────────────
export const PRIVACY: LegalDoc = {
  title: 'Privacy Policy',
  subtitle: 'MedVault Personal Health Records App',
  lastUpdated: 'June 30, 2026',
  blocks: [
    { kind: 'para', text: 'MedVault is committed to protecting your privacy and the security of your personal and health data. This Privacy Policy explains how we collect, use, store, protect, and share information when you use our App.' },
    { kind: 'para', text: 'This Policy complies with the Digital Personal Data Protection Act, 2023 (DPDPA 2023), IT (Reasonable Security Practices) Rules 2011, IT (Intermediaries Guidelines) Rules 2021, Consumer Protection Act 2019, and the General Data Protection Regulation (GDPR) for users in the European Union.' },

    { kind: 'divider' },
    { kind: 'heading', text: '1. Data Fiduciary (Controller)' },
    { kind: 'para', text: 'Under DPDPA 2023, the Data Fiduciary (equivalent to "Data Controller" under GDPR) responsible for processing your personal data is:' },
    { kind: 'bullet', text: 'App Name: MedVault' },
    { kind: 'bullet', text: 'Contact Email: magnusharsha@gmail.com' },
    { kind: 'bullet', text: 'Location: Hyderabad, Telangana, India' },

    { kind: 'divider' },
    { kind: 'heading', text: '2. Information We Collect' },
    { kind: 'subhead', text: '2.1 Information you provide directly' },
    { kind: 'bullet', text: 'Identity data: Full name, profile photograph/avatar.' },
    { kind: 'bullet', text: 'Contact data: Email address, phone number.' },
    { kind: 'bullet', text: 'Health & medical data: Medical reports, prescriptions, diagnostic images, lab results, discharge summaries, vaccination records, and any other health documents you upload.' },
    { kind: 'bullet', text: 'Profile data: Date of birth, blood group, doctor names, hospital names.' },
    { kind: 'bullet', text: 'Account credentials: Password (stored only as a one-way cryptographic hash — never in plain text).' },
    { kind: 'subhead', text: '2.2 Information collected automatically' },
    { kind: 'bullet', text: 'Device information: Device model, operating system version, unique device identifier.' },
    { kind: 'bullet', text: 'Usage data: App features used, screens visited (for improving the App).' },
    { kind: 'bullet', text: 'Error logs: Crash reports and technical error logs for debugging.' },
    { kind: 'para', text: 'We do NOT collect location data, browser history, contact lists, or any data unrelated to the App\'s function.' },

    { kind: 'divider' },
    { kind: 'heading', text: '3. How We Use Your Information' },
    { kind: 'bullet', text: 'To create and manage your account and authenticate your identity.' },
    { kind: 'bullet', text: 'To store, organise, and display your health records back to you.' },
    { kind: 'bullet', text: 'To generate PDF export summaries of your health records for sharing.' },
    { kind: 'bullet', text: 'To send appointment and follow-up reminders you have set.' },
    { kind: 'bullet', text: 'To respond to your support queries and grievances.' },
    { kind: 'bullet', text: 'To improve App performance, stability, and user experience.' },
    { kind: 'bullet', text: 'To comply with applicable legal obligations.' },
    { kind: 'para', text: 'We do NOT use your health data for advertising, profiling, or any purpose beyond providing the App service to you.' },

    { kind: 'divider' },
    { kind: 'heading', text: '4. Legal Basis for Processing' },
    { kind: 'para', text: 'Under DPDPA 2023 and GDPR, we process your data on the following legal bases:' },
    { kind: 'bullet', text: 'Consent: You explicitly consent to data processing when you create an account and accept these policies.' },
    { kind: 'bullet', text: 'Contract: Processing is necessary to provide the App services you have subscribed to.' },
    { kind: 'bullet', text: 'Legal Obligation: Where required by Indian law, court orders, or regulatory authorities.' },
    { kind: 'bullet', text: 'Legitimate Interest: For security monitoring, fraud prevention, and abuse detection.' },

    { kind: 'divider' },
    { kind: 'heading', text: '5. Sensitive Personal Data (SPDI)' },
    { kind: 'warning', text: '⚠️  Health and medical data is classified as Sensitive Personal Data or Information (SPDI) under the IT (Reasonable Security Practices) Rules, 2011, and as a special category under GDPR.' },
    { kind: 'para', text: 'For SPDI, we adhere to the following additional safeguards:' },
    { kind: 'bullet', text: 'We collect health data only with your free, prior, and explicit informed consent.' },
    { kind: 'bullet', text: 'Health data is used solely for the purposes stated in this Policy.' },
    { kind: 'bullet', text: 'We do NOT sell, rent, share, or trade your health data to any third party for commercial purposes.' },
    { kind: 'bullet', text: 'Health data is encrypted both in transit (HTTPS/TLS) and at rest on our servers.' },
    { kind: 'bullet', text: 'Access to health data is strictly limited to you and authorised technical personnel.' },

    { kind: 'divider' },
    { kind: 'heading', text: '6. Data Sharing and Third Parties' },
    { kind: 'para', text: 'We do NOT sell your personal data. We may share data only in the following limited circumstances:' },
    { kind: 'bullet', text: 'Cloud Infrastructure: Amazon Web Services (AWS) provides server hosting and file storage. AWS is bound by data processing agreements and does not independently access your data.' },
    { kind: 'bullet', text: 'Legal Requirements: We may disclose data when required by a valid court order, law enforcement request, or to comply with applicable Indian law.' },
    { kind: 'bullet', text: 'Business Transfers: In the event of a merger, acquisition, or sale of assets, user data may be transferred. We will notify you before such a transfer occurs.' },
    { kind: 'para', text: 'We require all third-party service providers to maintain appropriate security standards and restrict them from using your data for any purpose other than providing services to us.' },

    { kind: 'divider' },
    { kind: 'heading', text: '7. Data Security' },
    { kind: 'bullet', text: 'All data transmitted between your device and our servers is encrypted using HTTPS/TLS.' },
    { kind: 'bullet', text: 'Passwords are stored as one-way cryptographic hashes (never plain text).' },
    { kind: 'bullet', text: 'Access to production systems is restricted to authorised personnel only.' },
    { kind: 'bullet', text: 'We conduct periodic security reviews and vulnerability assessments.' },
    { kind: 'bullet', text: 'We implement reasonable security practices as prescribed under IT (Reasonable Security Practices) Rules, 2011.' },
    { kind: 'para', text: 'While we take all reasonable steps to protect your data, no method of electronic storage or transmission over the internet is 100% secure. In the event of a data breach, we will notify affected users within 72 hours as required by DPDPA 2023.' },

    { kind: 'divider' },
    { kind: 'heading', text: '8. Data Retention' },
    { kind: 'bullet', text: 'Your account data is retained for as long as your account remains active.' },
    { kind: 'bullet', text: 'Upon submitting an account deletion request, your personal data will be permanently deleted within 30 days.' },
    { kind: 'bullet', text: 'Certain data may be retained for a longer period where required by applicable Indian law.' },
    { kind: 'bullet', text: 'Anonymised and aggregated data (with no personally identifiable information) may be retained for analytical purposes.' },

    { kind: 'divider' },
    { kind: 'heading', text: '9. Your Rights' },
    { kind: 'para', text: 'Under DPDPA 2023 (India) and GDPR (EU), you have the following rights regarding your personal data:' },
    { kind: 'bullet', text: 'Right to Access: Request a copy of all personal data we hold about you.' },
    { kind: 'bullet', text: 'Right to Correction: Request correction of any inaccurate or incomplete data.' },
    { kind: 'bullet', text: 'Right to Erasure: Request deletion of your personal data ("Right to be Forgotten").' },
    { kind: 'bullet', text: 'Right to Withdraw Consent: Withdraw your consent at any time without affecting the lawfulness of prior processing.' },
    { kind: 'bullet', text: 'Right to Data Portability: Receive your data in a structured, machine-readable format.' },
    { kind: 'bullet', text: 'Right to Nomination (DPDPA 2023): Nominate another individual to exercise your data rights on your behalf.' },
    { kind: 'bullet', text: 'Right to Grievance Redressal: Lodge a complaint with our Grievance Officer (see Section 11).' },
    { kind: 'para', text: 'To exercise any of these rights, write to: magnusharsha@gmail.com. We will respond within 30 days.' },

    { kind: 'divider' },
    { kind: 'heading', text: '10. Cross-Border Data Transfer' },
    { kind: 'para', text: 'Your data may be stored on servers located outside India (e.g., AWS data centres in Singapore, the US, or other regions). By using MedVault, you explicitly consent to this cross-border transfer of your personal data.' },
    { kind: 'para', text: 'We ensure that adequate safeguards, including data processing agreements, are in place with all service providers in accordance with DPDPA 2023 and applicable international data transfer regulations.' },

    { kind: 'divider' },
    { kind: 'heading', text: '11. Children\'s Privacy' },
    { kind: 'para', text: 'MedVault is not intended for use by individuals under 18 years of age. We do not knowingly collect personal data from minors.' },
    { kind: 'para', text: 'If you believe that we have inadvertently collected personal data from a person under 18, please contact us immediately at magnusharsha@gmail.com, and we will promptly delete such data.' },

    { kind: 'divider' },
    { kind: 'heading', text: '12. Cookies and Tracking' },
    { kind: 'para', text: 'The MedVault mobile application does not use browser cookies. The App may use local device storage (AsyncStorage) to maintain your login session and app preferences. No cross-site tracking or advertising trackers are used.' },

    { kind: 'divider' },
    { kind: 'heading', text: '13. Grievance Officer' },
    { kind: 'para', text: 'As mandated by Rule 5(9) of the IT (Reasonable Security Practices) Rules, 2011, and the DPDPA 2023, we have designated a Grievance Officer to address privacy-related concerns:' },
    { kind: 'bullet', text: 'Role: Grievance Officer, MedVault' },
    { kind: 'bullet', text: 'Email: magnusharsha@gmail.com' },
    { kind: 'bullet', text: 'Location: Hyderabad, Telangana, India' },
    { kind: 'bullet', text: 'Acknowledgement: Within 48 hours of receipt.' },
    { kind: 'bullet', text: 'Resolution: Within 30 days of receipt.' },
    { kind: 'para', text: 'If you are not satisfied with our resolution, you may approach the Data Protection Board of India (once constituted under DPDPA 2023).' },

    { kind: 'divider' },
    { kind: 'heading', text: '14. Changes to Privacy Policy' },
    { kind: 'para', text: 'We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or applicable law. We will notify you of material changes through the App or via email at least 15 days before the changes take effect. Continued use of the App after notification constitutes acceptance of the revised Policy.' },

    { kind: 'divider' },
    { kind: 'heading', text: '15. Contact Us' },
    { kind: 'para', text: 'For any privacy-related questions, requests, or concerns:' },
    { kind: 'bullet', text: 'Email: magnusharsha@gmail.com' },
    { kind: 'bullet', text: 'We respond to all inquiries within 48 business hours.' },
  ],
};
