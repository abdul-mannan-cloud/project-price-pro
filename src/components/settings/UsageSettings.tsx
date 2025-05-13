import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import AddPaymentMethod from "../Onboarding/addPaymentMethod";
import { set } from "date-fns";

export const UsageSettings = ({ contractor }) => {
  const [cards, setCards] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await supabase.functions.invoke('get-payment-methods', {
          body: {
            customer_id: contractor?.stripe_customer_id,
          },
        });
        setCustomer(response.data.customer);
        setCards(response.data.paymentMethods.data.map((method) => {
          const card = method.card;
          return {
            display_brand: card.brand,
            exp_month: card.exp_month,
            exp_year: card.exp_year,
            funding: card.funding,
            last4: card.last4,
            paymentMethodID: method.id,
          };
        }));
      } catch (error) {
        console.error("Error fetching payment methods:", error);
        toast.error("Failed to load payment methods");
      }
    };

    if (contractor?.stripe_customer_id) {
      fetchPaymentMethods();
    }
  }, [contractor]);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!contractor?.stripe_customer_id) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('fetch-invoices', {
          body: {
            customerId: contractor?.stripe_customer_id,
            limit: 10,
            offset: 0
          }
        });

        if (error) {
          throw new Error(error.message || "Failed to fetch invoices");
        }

        if (data?.success) {
          setInvoices(data.invoices || []);
        }
      } catch (error) {
        console.error("Error fetching invoices:", error);
        toast.error("Failed to load invoices");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [contractor]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  const [show, setShow] = useState(false);
  const [clientSecret, setClientSecret] = useState();

  const handleAddPaymentMethod = async () => {
    const { data, error } = await supabase.functions.invoke('get-client-secret', {
      body: { customerId: contractor.stripe_customer_id },
    });
    
    setClientSecret(data.client_secret);
    setShow(true);
  }

  useEffect(() => {
    if (clientSecret) {
      setShow(true);
    }
  }, [clientSecret]);

  const handleCancel = () => {
    setShow(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Usage</h1>
      
      {/* Payment Methods Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium text-muted-foreground">Payment Methods</p>
          {/* <button 
            onClick={handleGenerateInvoice} 
            className="text-sm text-primary hover:underline"
          >
            Generate Invoice
          </button> */}
          <button
            onClick={() => handleAddPaymentMethod()}
            className="text-sm text-primary hover:underline"
          >
            Add Payemnt Method
          </button>
        </div>

        {
          show && (
            <div className="p-4 bg-gray-50 rounded-md">
              <h2 className="text-lg font-semibold">Add Payment Method</h2>
                <AddPaymentMethod customerName={contractor.businessName} customerId={contractor.stripe_customer_id} clientSecret={clientSecret} setCurrentStep={() => {}} handleSubmit={() => {}} handleBack={handleCancel}/>
            </div>
          )
        }
        
        <div className="border rounded-md overflow-hidden">
          {cards.length > 0 ? (
            cards.map((card, index) => (
              <div key={index} className={`flex items-center justify-between p-4 border-b border-gray-200 last:border-b-0 ${card.paymentMethodID === customer?.invoice_settings?.default_payment_method ? 'bg-gray-50' : ''}`}> 
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium capitalize">{card.display_brand}</span>
                  <span className="text-sm text-gray-500">**** **** **** {card.last4}</span>
                </div>
                <div className="text-sm text-gray-500">
                  {card.exp_month.toString().padStart(2, '0')}/{card.exp_year}
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-sm text-gray-500">No payment methods found</div>
          )}
        </div>
      </div>
      
      {/* Invoices Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium text-muted-foreground">Invoices</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length > 0 ? (
                invoices.map((invoice, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r">
                      {formatDate(invoice.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r">
                      {invoice.description || "Invoice"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r">
                      {formatCurrency(invoice.amount_paid)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full  ${
                        invoice.status === 'paid' 
                          ? 'text-green-800' 
                          : invoice.status === 'open' 
                          ? 'text-blue-800' 
                          : 'text-gray-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium ">
                      {invoice.invoice_pdf && (
                        <a
                          href={invoice.invoice_pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary-dark"
                        >
                          Download
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};