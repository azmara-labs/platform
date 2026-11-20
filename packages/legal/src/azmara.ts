// Azmara's own privacy policy: one document for the portal (app.azmara.io) and the Azmara
// website. Both sites render this and run `findPolicyDrift` in their tests, so the policy can't
// quietly stop matching what either site does.
//
// A draft for review, not legal advice. See the open decisions in the pull request that added it.

import type { PolicyDocument } from "./types.js";

export const azmaraPrivacyPolicy: PolicyDocument = {
  lastUpdated: "20 November 2026",
  // A mailbox that must exist before this is published.
  contact: "privacy@azmara.io",

  processors: [
    {
      name: "Supabase",
      purpose: "Database, sign-in and file storage for the portal",
      data: "Everything in your portal account: sign-in details, your business records and uploaded logos",
      location: "Sydney, Australia (AWS ap-southeast-2)",
      sites: ["app"],
      evidence: { dependency: "@supabase/supabase-js", env: "NEXT_PUBLIC_SUPABASE_URL" },
    },
    {
      name: "Vercel",
      purpose: "Hosting, and on the website, anonymous visit and speed measurements",
      data: "Requests to our sites, including your IP address, which appear in hosting logs",
      location:
        "Portal functions run in Sydney, Australia; Vercel's own infrastructure may be outside New Zealand",
      sites: ["app", "website"],
      evidence: { dependency: "next" },
    },
    {
      name: "Stripe",
      purpose: "Subscription billing, and card payments of invoices where a business turns them on",
      data: "Billing details and payment information you give Stripe directly, and invoice references",
      location: "Stripe's own infrastructure, which may be outside New Zealand",
      sites: ["app"],
      evidence: { dependency: "stripe", env: "STRIPE_SECRET_KEY" },
    },
    {
      name: "Resend",
      purpose: "Sending the portal's sign-up, password reset and invitation emails",
      data: "Your email address and the content of the email, including the one-time link",
      location: "Resend's own infrastructure, which may be outside New Zealand",
      sites: ["app"],
      evidence: { dependency: "resend", env: "RESEND_API_KEY" },
    },
    {
      name: "Cloudflare Turnstile",
      purpose: "Telling people from bots on the website's contact form",
      data: "Technical details of your browser and connection when you use the form",
      location: "Cloudflare's own infrastructure, which may be outside New Zealand",
      sites: ["website"],
      evidence: { dependency: "@marsidev/react-turnstile", env: "TURNSTILE_SECRET_KEY" },
    },
    {
      name: "Prismic",
      purpose: "Managing the website's content",
      data: "The website's pages are fetched from Prismic, so your browser may load images from its servers",
      location: "Prismic's own infrastructure, which may be outside New Zealand",
      sites: ["website"],
      evidence: { dependency: "@prismicio/client" },
    },
  ],

  sections: [
    {
      id: "who",
      heading: "Who we are",
      paragraphs: [
        "The Azmara website and the Azmara Portal at app.azmara.io are run by Azmara in Hamilton, New Zealand. This policy explains what personal information we collect through them, why, and what you can do about it. It follows the New Zealand Privacy Act 2020 and covers both.",
      ],
    },
    {
      id: "collect",
      heading: "What we collect",
      paragraphs: ["Which information we hold depends on how you use our sites."],
      list: [
        "On the website, when you contact us: your name, email address, phone number, location, the service you are asking about, how you would like us to reply, and your message.",
        "On the website, when you visit: anonymous visit and page-speed measurements, and an approximate location worked out from your IP address, which the site uses to show local details such as the weather.",
        "In the portal, when you sign up: your name, your email address, your business name and a password. We never see or store the password itself, only a salted hash held by our sign-in provider.",
        "In the portal, when you use it for your business: your business details (name, address, GST number, bank account for invoices, logo), your customers' contact details, and the quotations and invoices you create.",
        "In the portal, when you subscribe or take payment: Stripe collects card and billing details directly. We keep Stripe's reference numbers and payment status, not card numbers.",
        "On both, technical information such as your IP address and browser in hosting logs, and the cookies described below.",
      ],
    },
    {
      id: "why",
      heading: "Why we collect it",
      paragraphs: [
        "To answer your enquiry, create and secure your portal account, run the portal, send the emails it needs to send, bill for subscriptions, and look after our sites. We do not sell personal information and we do not use it for advertising.",
      ],
    },
    {
      id: "customers",
      heading: "Information about your own customers",
      paragraphs: [
        "When you enter your customers' details into the portal, that information is yours. We hold it for you so the portal can work, and we only use it to provide the service. You are responsible for having a proper basis to collect it and for telling your customers about it.",
      ],
    },
    {
      id: "cookies",
      heading: "Cookies and local storage",
      paragraphs: [
        "The portal sets cookies that keep you signed in. They are needed for it to work. Both sites remember your light or dark display choice in your browser, and the contact form's spam check may store a small token in your browser to tell you from a bot. We do not use advertising cookies, and our visit measurements do not use cookies.",
      ],
    },
    {
      id: "sharing",
      heading: "Who we share it with",
      paragraphs: [
        "We use the service providers below. Each receives only what it needs for the purpose shown. Contact form messages reach us by email through our email provider. We may also disclose information when the law requires it.",
      ],
    },
    {
      id: "overseas",
      heading: "Sending information overseas",
      paragraphs: [
        "The portal's database and hosting are in Australia. Some of our other providers may handle information outside New Zealand. We choose providers that protect information to a standard comparable to the New Zealand Privacy Act.",
      ],
    },
    {
      id: "keep",
      heading: "How long we keep it",
      paragraphs: [
        "We keep portal information while your account is open. Invoices and accounting records are kept for the seven years New Zealand tax law asks businesses to keep them. When an account is closed we delete or de-identify what we are not required to keep. Website enquiries are kept for as long as we need them to deal with your request.",
      ],
    },
    {
      id: "security",
      heading: "How we protect it",
      paragraphs: [
        "Data is encrypted in transit, access to each business's records in the portal is restricted to that business, and our providers' access is limited to what they need. No system is perfectly secure. If a breach is likely to cause serious harm we will notify the people affected and the Privacy Commissioner as the Act requires.",
      ],
    },
    {
      id: "children",
      heading: "Children",
      paragraphs: [
        "Our sites are for businesses and are not directed at children. We do not knowingly collect information from children.",
      ],
    },
    {
      id: "rights",
      heading: "Your rights",
      paragraphs: [
        "You can ask us for the personal information we hold about you and ask us to correct it. Email us at the address below and we will respond within 20 working days. If we cannot resolve a concern you can contact the Office of the Privacy Commissioner at privacy.org.nz.",
      ],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      paragraphs: [
        "When we change this policy we will update the date at the top. If a change affects how we use your information we will tell you by email.",
      ],
    },
  ],
};
