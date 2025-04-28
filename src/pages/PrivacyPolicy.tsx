import { Header1 } from "@/components/ui/header";

const PrivacyPolicy = () => {
    return (
        <div className="px-4 md:px-20 py-10 max-w-6xl mx-auto">
            <Header1 />
            <div className="mt-12 text-gray-700 text-base leading-relaxed">
                <h1>Privacy Policy</h1>
                <p>Last Updated: 3/14/2025</p>

                <section>
                    <h2 className="mt-8 text-lg font-semibold leading-none tracking-tight my-4">1. Introduction</h2>
                    <p>
                        Welcome to <strong>Estimatrix</strong> ("we," "our," or "us"). We provide an AI-powered construction estimate generator designed to connect customers with contractors. This Privacy Policy explains how we collect, use, and protect your personal data in compliance with the General Data Protection Regulation (GDPR) and other relevant privacy laws.
                    </p>
                    <p className="mt-2">
                        By using Estimatrix, you consent to our collection and use of your personal information as described in this policy.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">2. Data We Collect</h2>
                    <ul className="list-disc list-inside space-y-2 px-5 text-[15px] text-muted-foreground">
                        <li><strong>Identity & Contact Information:</strong> Name, email, phone number.</li>
                        <li><strong>Project Details:</strong> Information users provide about their construction project.</li>
                        <li><strong>Payment Information:</strong> Credit/debit card details, billing address (processed securely).</li>
                        <li><strong>Technical Data:</strong> IP address, device information, browsing activity on our site.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">3. How We Use Your Data</h2>
                    <ul className="list-disc list-inside space-y-2 text-[15px] text-muted-foreground px-5">
                        <li>Generating construction estimates using AI.</li>
                        <li>Connecting users with contractors who can provide services.</li>
                        <li>Marketing and promotional activities (email campaigns, special offers, etc.).</li>
                        <li>Analyzing website performance using tracking tools like Google Analytics.</li>
                        <li>Processing payments securely through third-party payment providers.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">4. Data Sharing with Contractors & Third Parties</h2>
                    <ul className="list-disc list-inside space-y-2 text-[15px] text-muted-foreground px-5">
                        <li>Contractors to provide project estimates and services.</li>
                        <li>Third-party service providers (e.g., payment processors, analytics tools).</li>
                    </ul>
                    <p className="mt-2">
                        All third-party providers follow data protection regulations to ensure user privacy.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">5. Legal Basis for Processing (GDPR Compliance)</h2>
                    <ul className="list-disc list-inside space-y-2 text-[15px] text-muted-foreground px-5">
                        <li>Performance of a contract (to provide estimates and connect users with contractors).</li>
                        <li>Legitimate interests (marketing and service improvements).</li>
                        <li>User consent (for marketing communications).</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">6. Data Security & Retention</h2>
                    <ul className="list-disc list-inside space-y-2 text-[15px] text-muted-foreground px-5">
                        <li><strong>Encryption & Secure Storage:</strong> All personal and payment data is encrypted and stored securely.</li>
                        <li><strong>Retention Period:</strong> User data is stored indefinitely unless a deletion request is made.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">7. User Rights Under GDPR</h2>
                    <p>If you are a resident of the EU or EEA, you have the following rights regarding your personal data:</p>
                    <ul className="list-disc list-inside space-y-2 mt-2 text-[15px] text-muted-foreground px-5">
                        <li><strong>Right to access:</strong> Request a copy of the data we hold about you.</li>
                        <li><strong>Right to rectify:</strong> Correct inaccurate or incomplete data.</li>
                        <li><strong>Right to erase:</strong> Request deletion of your data.</li>
                        <li><strong>Right to object:</strong> Opt out of certain data processing (e.g., marketing).</li>
                        <li><strong>Right to data portability:</strong> Request your data in a structured format.</li>
                    </ul>
                    <p className="mt-2">
                        To exercise any of these rights, please contact us at: <span className="text-blue-600 underline">[Insert Contact Email]</span>
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">8. International Data Transfers</h2>
                    <p>
                        As we may use third-party services outside the EU/EEA, we ensure all data transfers comply with GDPR through Standard Contractual Clauses (SCCs) or other legal safeguards.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">9. Updates to This Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time. Any changes will be posted on this page. Users are encouraged to review the policy periodically.
                    </p>
                </section>
            </div>
        </div>
    );
}

export default PrivacyPolicy;
