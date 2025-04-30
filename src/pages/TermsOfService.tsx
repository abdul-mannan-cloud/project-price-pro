import { useNavigate } from "react-router-dom";
import { Header1 } from "@/components/ui/header";

const TermsOfService = () => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (window.history.length > 2) {
            navigate(-1); // Go back to the previous page in history
        } else {
            navigate("/"); // Fallback to home if there's no history
        }
    };

    return (
        <div className="px-4 md:px-20 py-10 max-w-6xl mx-auto">
            <Header1 />
            <div className="mt-12 text-gray-700 text-base leading-relaxed">
                <button
                    onClick={handleBack}
                    className="text-primary hover:underline text-sm mb-4"
                >
                    ← Back
                </button>

                <h1>Terms of Service</h1>
                <p>Last Updated: 3/14/2025</p>

                <section>
                    <h2 className="mt-8 text-lg font-semibold leading-none tracking-tight my-4">1. Acceptance of Terms</h2>
                    <p>
                        Welcome to <strong>Estimatrix</strong> ("we," "our," or "us"). By accessing or using our website and services, you agree to these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our platform.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">2. Description of Services</h2>
                    <p>
                        Estimatrix provides an AI-powered construction estimate generator that connects users ("Customers") with contractors ("Contractors") for potential services. We do not perform construction work ourselves but act as a lead generation platform.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">3. User Accounts & Responsibilities</h2>
                    <ul className="list-disc list-inside space-y-2 text-[15px] text-muted-foreground px-5">
                        <li>Users must provide accurate and complete information when creating an account.</li>
                        <li>Users must be at least 18 years old to use our services.</li>
                        <li>Users are responsible for maintaining the confidentiality of their account credentials.</li>
                        <li>Misuse of our platform, including fraudulent project requests or spamming, is strictly prohibited.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">4. Payments & Transactions</h2>
                    <ul className="list-disc list-inside space-y-2 text-[15px] text-muted-foreground px-5">
                        <li>Estimatrix may charge users for premium services, estimate generation, or lead access.</li>
                        <li>Payments are processed securely through third-party payment providers.</li>
                        <li>Users agree that all transactions are final unless otherwise stated in our refund policy.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">5. Relationship Between Customers & Contractors</h2>
                    <ul className="list-disc list-inside space-y-2 text-[15px] text-muted-foreground px-5">
                        <li>Estimatrix does not employ or endorse Contractors. Any agreements made between Customers and Contractors are independent of Estimatrix.</li>
                        <li>We are not responsible for the quality, pricing, or completion of services provided by Contractors.</li>
                        <li>Users should conduct their own research and due diligence before hiring a Contractor.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">6. Prohibited Activities</h2>
                    <ul className="list-disc list-inside space-y-2 text-[15px] text-muted-foreground px-5">
                        <li>Use the platform for illegal activities.</li>
                        <li>Misrepresent project details or provide false information.</li>
                        <li>Attempt to hack, disrupt, or overload the website.</li>
                        <li>Use automated bots or scraping tools to extract data.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">7. Limitation of Liability</h2>
                    <p>
                        Estimatrix is provided "as is" without warranties of any kind. We do not guarantee the accuracy of AI-generated estimates.
                        We are not liable for any disputes, damages, or losses resulting from interactions between Customers and Contractors.
                        In no event shall Estimatrix be liable for more than the amount paid (if any) by the user for services rendered.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">8. Privacy Policy</h2>
                    <p>
                        Your use of Estimatrix is also governed by our Privacy Policy, which explains how we collect, use, and protect your data.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">9. Modifications to the Terms</h2>
                    <p>
                        We reserve the right to update these Terms at any time. Continued use of our services after an update constitutes acceptance of the new Terms.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold leading-none tracking-tight my-4">10. Termination of Service</h2>
                    <p>
                        We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activities.
                    </p>
                </section>
            </div>
        </div>
    );
}

export default TermsOfService;
