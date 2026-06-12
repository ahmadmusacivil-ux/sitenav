import { createFileRoute } from "@tanstack/react-router";
import LegalPage, { LegalSection, LegalSubsection } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — LOST" },
      { name: "description", content: "How LOST collects, uses, and protects your personal information." },
    ],
  }),
  component: PrivacyPage,
});

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-6 space-y-1.5 marker:text-orange-500">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

function PrivacyPage() {
  return (
    <LegalPage title="LOST — Privacy Policy" effectiveDate="8 June 2026" lastUpdated="8 June 2026">
      <LegalSection heading="1. Introduction">
        <p>
          This Privacy Policy explains how LOST ("we", "us", "our"), operated by Ahmad Al Mustafa
          (ABN 33 779 071 620) of South Australia, Australia, collects, uses, stores, and protects
          your personal information when you use the LOST website and application (the "Service").
        </p>
        <p>
          LOST is a navigation tool that allows users to create, share, and follow custom GPS routes
          within private or unmapped sites such as construction sites, farms, ports, mines, and event
          venues.
        </p>
        <p>
          We are committed to handling your personal information in accordance with the Australian
          Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs). Where applicable to
          users outside Australia, we also aim to respect the principles of the EU General Data
          Protection Regulation (GDPR) and similar international privacy laws.
        </p>
        <p>
          By creating an account or using the Service, you consent to the collection and use of your
          information as described in this Privacy Policy. If you do not agree, please do not use the
          Service.
        </p>
      </LegalSection>

      <LegalSection heading="2. Information We Collect">
        <LegalSubsection heading="2.1 Information You Provide Directly">
          <Bullets
            items={[
              "Account information: email address and password (passwords are encrypted and never stored in plain text) when you register an account.",
              'Route data: route names, waypoints, pins, labels (e.g. "Entry", "Office"), route types, and any other content you create within the Service.',
              "Communications: any information you send us when you contact us for support or feedback.",
            ]}
          />
        </LegalSubsection>
        <LegalSubsection heading="2.2 Information Collected Automatically">
          <Bullets
            items={[
              'Location data (GPS): when you create a route using "Drive & Record" mode or follow a route with the live position indicator, we process your device\'s GPS coordinates. Location access is only used while you are actively using these features and requires your device-level permission, which you can revoke at any time in your device settings.',
              "Technical data: browser type, device type, operating system, and approximate region, collected through standard web technologies for the purpose of operating and improving the Service.",
              "Usage data: basic interaction data such as when routes are created, opened, or shared.",
            ]}
          />
        </LegalSubsection>
        <LegalSubsection heading="2.3 Information We Do NOT Collect">
          <p>
            We do not collect payment information, advertising identifiers, or sensitive personal
            information beyond what is necessary to operate the Service.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection heading="3. How We Use Your Information">
        <p>We use your information to:</p>
        <Bullets
          items={[
            "Provide the core Service: creating, saving, sharing, and following routes.",
            "Authenticate your account and keep it secure.",
            "Display your live position on the map while you are actively navigating.",
            "Respond to your support requests and feedback.",
            "Maintain, troubleshoot, and improve the Service.",
            "Comply with legal obligations.",
          ]}
        />
        <p>
          We do not use your personal information for advertising or marketing purposes without your
          explicit consent.
        </p>
      </LegalSection>

      <LegalSection heading="4. Location Data — Special Notice">
        <p>Because LOST is a navigation tool, location data is central to the Service. Please note:</p>
        <Bullets
          items={[
            "GPS coordinates you record as part of a route are stored as route data and are visible to anyone you share that route with.",
            "Your live position while following a route is processed on your device and is not stored on our servers as a location history.",
            "You control location access through your device permissions. Disabling location access will limit navigation features but you may still view routes.",
            "Be mindful when recording routes: a recorded route reveals the locations you travelled. Do not record or share routes containing locations you wish to keep private.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="5. How We Store and Protect Your Information">
        <Bullets
          items={[
            "Your data is stored using Supabase, a third-party cloud database provider, which may store data on servers located outside Australia (including the United States). By using the Service, you consent to this overseas transfer and storage.",
            "Access to data is restricted through authentication and row-level security, meaning users can only access their own routes and routes explicitly shared with them.",
            "Data is transmitted over encrypted connections (HTTPS).",
            "While we take reasonable steps to protect your information, no method of electronic storage or transmission is 100% secure, and we cannot guarantee absolute security.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="6. Sharing of Information">
        <p>We share your information only in the following circumstances:</p>
        <Bullets
          items={[
            "With people you choose: when you generate a share link or QR code for a route, anyone with that link can view that route, including its waypoints, pins, and labels. Share links do not expire unless the route is deleted.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="7. Data Retention">
        <Bullets
          items={[
            "Account data is retained for as long as your account is active.",
            "Route data is retained until you delete the route or your account.",
            "When you delete your account, we will delete or de-identify your personal information within a reasonable period, except where we are required to retain it by law.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="8. Your Rights">
        <p>Depending on your location, you have the right to:</p>
        <Bullets
          items={[
            "Access the personal information we hold about you.",
            "Request correction of inaccurate information.",
            "Request deletion of your account and associated data.",
            "Withdraw consent to location processing at any time (via device settings).",
            "Complain to a privacy regulator. In Australia, this is the Office of the Australian Information Commissioner (OAIC) at www.oaic.gov.au.",
          ]}
        />
        <p>
          To exercise any of these rights, contact us at ahmadmusa.civil@gmail.com. We will respond
          within a reasonable timeframe.
        </p>
      </LegalSection>

      <LegalSection heading="9. Cookies and Similar Technologies">
        <p>
          The Service uses essential cookies and local storage strictly necessary for authentication
          and keeping you logged in. We do not currently use advertising or third-party tracking
          cookies. If this changes, we will update this Policy and seek consent where required.
        </p>
      </LegalSection>

      <LegalSection heading="10. Children's Privacy">
        <p>
          The Service is intended for use by adults in workplace and professional contexts. It is not
          directed at children under 16, and we do not knowingly collect personal information from
          children. If you believe a child has provided us personal information, please contact us so
          we can delete it.
        </p>
      </LegalSection>

      <LegalSection heading="11. International Users">
        <p>
          The Service may be accessed globally. If you access the Service from outside Australia, you
          understand that your information will be processed in Australia and in the countries where
          our service providers operate. Where the GDPR applies, our legal bases for processing are:
          performance of a contract (providing the Service you request), consent (location data), and
          legitimate interests (security and service improvement).
        </p>
      </LegalSection>

      <LegalSection heading="12. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will post the updated version on
          the Service with a revised "Last Updated" date. Material changes will be notified within
          the Service. Continued use after changes constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection heading="13. Contact Us">
        <p>For privacy questions, requests, or complaints, contact:</p>
        <Bullets
          items={[
            "Operator: Ahmad Al Mustafa",
            "Email: ahmadmusa.civil@gmail.com",
            "Location: South Australia, Australia",
          ]}
        />
      </LegalSection>
    </LegalPage>
  );
}