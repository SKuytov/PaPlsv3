import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Plus, ShoppingCart, FileText, CreditCard } from 'lucide-react';
import CreateQuoteForm from './CreateQuoteForm';
import CreateOrderForm from './CreateOrderForm';
import CreateInvoiceForm from './CreateInvoiceForm';
import CreatePaymentForm from './CreatePaymentForm';

const RequestDetailModal = ({ isOpen, onClose, request }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateQuote, setShowCreateQuote] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRequestData();
    }
  }, [isOpen, request?.id]);

  const fetchRequestData = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual API calls
      // const quotesRes = await fetch(`${import.meta.env.VITE_API_URL}/api/quotes/${request.id}`);
      // const ordersRes = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${request.id}`);
      // const invoicesRes = await fetch(`${import.meta.env.VITE_API_URL}/api/invoices/${request.id}`);
      // const paymentsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/${request.id}`);
      setQuotes([]);
      setOrders([]);
      setInvoices([]);
      setPayments([]);
    } catch (err) {
      console.error('Error fetching request data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuoteCreated = (quote) => {
    setQuotes([...quotes, quote]);
    setShowCreateQuote(false);
  };

  const handleOrderCreated = (order) => {
    setOrders([...orders, order]);
    setShowCreateOrder(false);
  };

  const handleInvoiceCreated = (invoice) => {
    setInvoices([...invoices, invoice]);
    setShowCreateInvoice(false);
  };

  const handlePaymentCreated = (payment) => {
    setPayments([...payments, payment]);
    setShowCreatePayment(false);
  };

  if (!isOpen || !request) return null;

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{request.title}</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getStatusColor(request.status)}>
                {request.status.replace('-', ' ')}
              </Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="quotes">Quotes ({quotes.length})</TabsTrigger>
              <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
              <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
              <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500">Description</p>
                      <p className="text-gray-900 font-medium">{request.description}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Priority</p>
                      <p className="text-gray-900 font-medium capitalize">{request.priority}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Estimated Budget</p>
                      <p className="text-gray-900 font-medium">€{request.estimated_budget?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Requested By</p>
                      <p className="text-gray-900 font-medium">{request.requested_by}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Created</p>
                      <p className="text-gray-900 font-medium">{new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Updated</p>
                      <p className="text-gray-900 font-medium">{new Date(request.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Workflow Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${quotes.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-sm text-gray-600">Quotes: {quotes.length > 0 ? 'Received' : 'Pending'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${orders.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-sm text-gray-600">Orders: {orders.length > 0 ? 'Placed' : 'Pending'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${invoices.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-sm text-gray-600">Invoices: {invoices.length > 0 ? 'Created' : 'Pending'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${payments.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-sm text-gray-600">Payments: {payments.length > 0 ? 'Processed' : 'Pending'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Quotes Tab */}
            <TabsContent value="quotes" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowCreateQuote(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Quote
                </Button>
              </div>
              {quotes.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-600">No quotes yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {quotes.map(quote => (
                    <Card key={quote.id}>
                      <CardContent className="pt-6">
                        <p className="text-gray-900 font-medium">€{quote.amount?.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">{quote.supplier}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {showCreateQuote && (
                <CreateQuoteForm
                  requestId={request.id}
                  onSubmit={handleQuoteCreated}
                  onCancel={() => setShowCreateQuote(false)}
                />
              )}
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowCreateOrder(true)}
                  className="gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Create Order
                </Button>
              </div>
              {orders.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-600">No orders yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {orders.map(order => (
                    <Card key={order.id}>
                      <CardContent className="pt-6">
                        <p className="text-gray-900 font-medium">Order {order.order_number}</p>
                        <p className="text-sm text-gray-600">Status: {order.status}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {showCreateOrder && (
                <CreateOrderForm
                  requestId={request.id}
                  onSubmit={handleOrderCreated}
                  onCancel={() => setShowCreateOrder(false)}
                />
              )}
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowCreateInvoice(true)}
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Create Invoice
                </Button>
              </div>
              {invoices.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-600">No invoices yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {invoices.map(invoice => (
                    <Card key={invoice.id}>
                      <CardContent className="pt-6">
                        <p className="text-gray-900 font-medium">Invoice {invoice.invoice_number}</p>
                        <p className="text-sm text-gray-600">Status: {invoice.status}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {showCreateInvoice && (
                <CreateInvoiceForm
                  requestId={request.id}
                  onSubmit={handleInvoiceCreated}
                  onCancel={() => setShowCreateInvoice(false)}
                />
              )}
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowCreatePayment(true)}
                  className="gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Record Payment
                </Button>
              </div>
              {payments.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-600">No payments yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {payments.map(payment => (
                    <Card key={payment.id}>
                      <CardContent className="pt-6">
                        <p className="text-gray-900 font-medium">€{payment.amount?.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Status: {payment.status}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {showCreatePayment && (
                <CreatePaymentForm
                  requestId={request.id}
                  onSubmit={handlePaymentCreated}
                  onCancel={() => setShowCreatePayment(false)}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default RequestDetailModal;