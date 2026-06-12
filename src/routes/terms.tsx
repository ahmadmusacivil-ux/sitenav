import { createFileRoute } from "@tanstack/react-router";
import LegalPage, { LegalSection, LegalSubsection } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — LOST" },
      { name: "description", content: "The legal terms that govern your use of LOST." },
    ],
  }),
  component: TermsPage,
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

function TermsPage() {
  return (
    <LegalPage title="LOST — Terms & Conditions" effectiveDate="8 June 2026" lastUpdated="8 June 2026">
      <LegalSection heading="1. Agreement to These Terms">
        <p>
          These Terms &amp; Conditions ("Terms") form a legally binding agreement between you ("you",
          "user") and Ahmad Al Mustafa (ABN 33 779 071 620) ("LOST", "we", "us", "our") governing
          your use of the LOST website and application (the "Service").
        </p>
        <p>
          By creating an account, accessing, or using the Service in any way, you confirm that you
          have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you
          do not agree, you must not use the Service.
        </p>
        <p>
          If you are using the Service on behalf of a company or organisation, you represent that you
          have authority to bind that organisation, and "you" includes that organisation.
        </p>
      </LegalSection>

      <LegalSection heading="2. The Service">
        <p>LOST is a tool that allows users to:</p>
        <Bullets
          items={[
            "Draw or record custom GPS routes on satellite imagery within private or unmapped sites (such as construction sites, farms, ports, mines, and event venues);",
            "Add waypoints, pins, and labels to those routes;",
            "Share routes with others via links or QR codes; and",
            "Follow shared routes using a live GPS position indicator.",
          ]}
        />
        <p>
          LOST is a visual aid only. It is not a certified navigation system, a safety device, a
          traffic management system, or a substitute for site inductions, signage, spotters,
          supervision, or professional judgment. The accuracy of any route depends entirely on the
          person who created it and on GPS conditions at the time of use.
        </p>
      </LegalSection>

      <LegalSection heading="3. Eligibility and Accounts">
        <Bullets
          items={[
            "You must be at least 16 years of age (or the age of digital consent in your jurisdiction) to create an account.",
            "You must provide accurate registration information and keep your login credentials confidential.",
            "You are responsible for all activity that occurs under your account. Notify us immediately if you suspect unauthorised access.",
            "We may suspend or terminate accounts that violate these Terms.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="4. Acceptable Use">
        <p>You agree that you will NOT:</p>
        <Bullets
          items={[
            "Use the Service in any way that endangers any person or property;",
            "Create or share routes that direct people through areas that are dangerous, restricted, or prohibited (e.g. exclusion zones, live work areas, unstable ground, areas without authorised access);",
            "Use the Service while operating a vehicle or machinery in a manner that distracts you from safe operation (set up navigation before moving; interact with the screen only when stationary or have a passenger operate it);",
            "Use the Service to trespass, or to map or share locations you do not have authority to access or disclose;",
            "Use the Service to track or monitor any person without their knowledge and consent;",
            "Upload malicious code, attempt to gain unauthorised access to the Service or its data, or interfere with its operation;",
            "Copy, scrape, resell, or commercially exploit the Service or its content without our written permission;",
            "Use the Service in violation of any applicable law, regulation, or site rule.",
          ]}
        />
        <p>
          We may remove content and suspend or terminate access for breaches of this section, with or
          without notice.
        </p>
      </LegalSection>

      <LegalSection heading="5. Routes and User Content">
        <LegalSubsection heading="5.1 Your Content">
          <p>
            Routes, waypoints, pins, labels, and names you create ("User Content") remain yours. You
            retain all ownership rights in your User Content.
          </p>
        </LegalSubsection>
        <LegalSubsection heading="5.2 Licence You Grant Us">
          <p>
            By creating User Content on the Service, you grant us a worldwide, non-exclusive,
            royalty-free licence to host, store, reproduce, display, and transmit that content solely
            for the purpose of operating, providing, and improving the Service (for example: storing
            your route in our database and displaying it to people you share it with). This licence
            ends when you delete the content or your account, except where content has been shared
            with others or where retention is required by law.
          </p>
        </LegalSubsection>
        <LegalSubsection heading="5.3 Your Responsibility for Routes You Create">
          <p>
            If you create or share a route, you are solely responsible for its accuracy and safety.
            You confirm that: (a) you have authority to map and share the locations in the route;
            (b) the route follows paths that are safe and approved for the intended users and vehicle
            types; and (c) you will update or delete the route promptly if site conditions change and
            the route becomes inaccurate or unsafe.
          </p>
          <p>
            Where the Service provides a route expiry feature, you should assign an expiry date to
            any route on a site where conditions are likely to change, and you must not rely on
            expiry dates as a substitute for promptly updating or deleting routes that have become
            unsafe.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection heading="6. [Section content to be added]">
        <p className="text-navy-500 italic">
          [Please paste the original content for Terms Section 6 into{" "}
          <code>src/routes/terms.tsx</code>. This placeholder was added because the section was
          truncated when the content was provided.]
        </p>
      </LegalSection>

      <LegalSection heading="7. [Section content to be added]">
        <p className="text-navy-500 italic">
          [Please paste the original content for Terms Section 7 into{" "}
          <code>src/routes/terms.tsx</code>. This placeholder was added because the section was
          truncated when the content was provided.]
        </p>
      </LegalSection>

      <LegalSection heading="8. [Section content to be added]">
        <p className="text-navy-500 italic">
          [Please paste the original content for Terms Section 8 into{" "}
          <code>src/routes/terms.tsx</code>. This placeholder was added because the section was
          truncated when the content was provided.]
        </p>
      </LegalSection>

      <LegalSection heading="9. Australian Consumer Law">
        <p>
          Nothing in these Terms excludes, restricts, or modifies any consumer guarantee, right, or
          remedy under the Australian Consumer Law (Schedule 2 of the Competition and Consumer Act
          2010 (Cth)) or other legislation that cannot lawfully be excluded. To the extent we are
          permitted to limit our liability for breach of a non-excludable guarantee, our liability is
          limited, at our option, to the resupply of the services or the cost of resupplying the
          services.
        </p>
      </LegalSection>

      <LegalSection heading="10. Limitation of Liability">
        <p>To the maximum extent permitted by law:</p>
        <Bullets
          items={[
            "We will not be liable for any indirect, incidental, special, consequential, punitive, or exemplary damages, or for any loss of profits, revenue, data, goodwill, or business opportunity, arising out of or in connection with your use of (or inability to use) the Service.",
            "We will not be liable for any death, personal injury, property damage, vehicle damage, project delay, or financial loss arising from: (a) reliance on any route or position displayed in the Service; (b) GPS or map inaccuracy; (c) routes created, modified, or shared by users; (d) Service unavailability; or (e) your failure to follow site rules, signage, instructions, or applicable laws — except to the extent such liability arises from our own negligence and cannot be excluded by law.",
            "Our total aggregate liability for all claims arising out of or relating to the Service or these Terms will not exceed the greater of: (a) the amount you paid us for the Service in the 12 months before the claim arose; or (b) AUD $100.",
            "These limitations apply regardless of the legal theory of the claim (contract, tort including negligence, statute, or otherwise) and even if we have been advised of the possibility of such damages.",
          ]}
        />
        <p>
          Some jurisdictions do not allow certain exclusions or limitations, so some of the above may
          not apply to you. In those cases, our liability is limited to the minimum extent permitted
          by law.
        </p>
      </LegalSection>

      <LegalSection heading="11. Indemnity">
        <p>
          You agree to indemnify and hold harmless LOST, its operator, and their representatives from
          and against any claims, liabilities, damages, losses, costs, and expenses (including
          reasonable legal fees) arising out of or in connection with: (a) your use or misuse of the
          Service; (b) routes you create or share, including any injury, damage, or loss suffered by
          anyone following them; (c) your breach of these Terms; (d) your violation of any law or the
          rights of any third party; or (e) your accessing or mapping locations without authority.
        </p>
      </LegalSection>

      <LegalSection heading="12. Third-Party Services">
        <p>
          The Service relies on third-party services including Supabase (database and authentication),
          hosting providers, and Esri (satellite imagery), and may link to third-party services such
          as Google Maps for navigation to a route's starting point. We are not responsible for the
          availability, accuracy, content, or practices of third-party services. Your use of them is
          subject to their own terms and policies.
        </p>
      </LegalSection>

      <LegalSection heading="13. Termination">
        <Bullets
          items={[
            "You may stop using the Service and delete your account at any time.",
            "We may suspend or terminate your access immediately if you breach these Terms, create safety risks for others, or where required by law.",
            "Upon termination, your right to use the Service ceases. Sections of these Terms that by their nature should survive termination (including Sections 5, 6, 7, 9, 10, 11, and 15) will survive.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="14. Changes to These Terms">
        <p>
          We may update these Terms from time to time. The updated version will be posted on the
          Service with a revised "Last Updated" date, and material changes will be notified within
          the Service. Your continued use of the Service after changes take effect constitutes
          acceptance of the updated Terms.
        </p>
      </LegalSection>

      <LegalSection heading="15. Governing Law and Disputes">
        <p>
          These Terms are governed by the laws of South Australia, Australia. You and we submit to
          the non-exclusive jurisdiction of the courts of that state and the Commonwealth of
          Australia. Before commencing any court proceedings, the parties agree to first attempt in
          good faith to resolve any dispute by negotiation, by contacting us at
          ahmadmusa.civil@gmail.com.
        </p>
      </LegalSection>

      <LegalSection heading="16. General">
        <Bullets
          items={[
            "Severability: if any provision of these Terms is found invalid or unenforceable, the remaining provisions remain in full force.",
            "No waiver: our failure to enforce any provision is not a waiver of our right to do so later.",
            "Assignment: you may not assign these Terms without our consent. We may assign these Terms in connection with a business transfer.",
            "Entire agreement: these Terms, together with the Privacy Policy and Safety Disclaimer, constitute the entire agreement between you and us regarding the Service.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="17. Contact">
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