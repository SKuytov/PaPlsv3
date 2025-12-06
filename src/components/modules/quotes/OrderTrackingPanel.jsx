import { useToast } from '@/components/ui/use-toast';
import * as Dialog from '@radix-ui/react-dialog';

const OrderTrackingPanel = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'confirmed', 'shipped', 'delivered'
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderData, setOrderData] = useState({
    order_number: '',
    agreed_delivery_date: '',
    notes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          part:spare_parts(id, name, part_number),
          supplier:suppliers(id, name, email),
          quote:quotes(quote_request_id, quoted_unit_price, quoted_delivery_date)
        `)
        .order('ordered_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('order_status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load orders"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async (quote) => {
    setSelectedQuote(quote);
    setOrderData({
      order_number: '',
      agreed_delivery_date: new Date(quote.quoted_delivery_date).toISOString().split('T')[0],
      notes: ''
    });
    setShowOrderModal(true);
  };

  const handleSaveOrder = async () => {
    if (!orderData.order_number || !orderData.agreed_delivery_date) {
      toast({
        variant: "destructive",
        title: "Required Fields",
        description: "Please fill in order number and delivery date"
      });
      return;
    }

    try {
      // Find the quote request to get part and supplier info
      const { data: quoteRequest, error: qrError } = await supabase
        .from('quote_requests')
        .select('*')
        .eq('id', selectedQuote.quote_request_id)
        .single();

      if (qrError) throw qrError;

      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .eq('quote_request_id', selectedQuote.quote_request_id)
        .single();

      if (quotesError) throw quotesError;

      // Create order
      const totalCost = quoteRequest.quantity_requested * selectedQuote.quoted_unit_price;

      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          quote_id: quotes.id,
          part_id: quoteRequest.part_id,
          supplier_id: quoteRequest.supplier_id,
          order_number: orderData.order_number,
          ordered_quantity: quoteRequest.quantity_requested,
          ordered_unit_price: selectedQuote.quoted_unit_price,
          total_cost: totalCost,
          agreed_delivery_date: orderData.agreed_delivery_date,
          order_status: 'pending',
          ordered_at: new Date().toISOString()
        });

      if (orderError) throw orderError;

      // Create delivery record
      await supabase
        .from('deliveries')
        .insert({
          order_id: (await supabase.from('orders').select('id').order('ordered_at', { ascending: false }).limit(1).single()).data.id,
          part_id: quoteRequest.part_id,
          expected_delivery_date: orderData.agreed_delivery_date,
          delivery_status: 'pending'
        });

      toast({
        title: "Order Placed!",
        description: `Order #${orderData.order_number} created successfully`
      });

      setShowOrderModal(false);
      loadOrders();
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Order Updated",
        description: `Order status changed to ${newStatus}`
      });

      loadOrders();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending', icon: Clock },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Confirmed', icon: CheckCircle },
      shipped: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Shipped', icon: Truck },
      delivered: { bg: 'bg-green-100', text: 'text-green-700', label: 'Delivered', icon: CheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled', icon: AlertCircle }
    };

    const config = statusConfig[status];
    const Icon = config?.icon || Clock;

    return (
      <div className={`flex items-center gap-1 px-3 py-1 rounded-full w-fit ${config.bg}`}>
        <Icon className="h-3 w-3" />
        <span className={`text-xs font-semibold ${config.text}`}>{config.label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Order Tracking</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['all', 'pending', 'confirmed', 'shipped', 'delivered'].map(status => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
              className="capitalize whitespace-nowrap"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No orders found</div>
        ) : (
          orders.map(order => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Order Number */}
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">ORDER</p>
                    <p className="font-bold text-lg text-teal-600">{order.order_number}</p>
                  </div>

                  {/* Part Info */}
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">PART</p>
                    <p className="font-semibold text-slate-900">{order.part?.name}</p>
                    <p className="text-xs text-slate-600">Qty: {order.ordered_quantity}</p>
                  </div>

                  {/* Cost & ETA */}
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">TOTAL COST</p>
                    <p className="font-bold text-lg text-slate-900">€{order.total_cost?.toFixed(2)}</p>
                    <p className="text-xs text-slate-600">ETA: {new Date(order.agreed_delivery_date).toLocaleDateString()}</p>
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">STATUS</p>
                    <div className="mt-1">
                      {getStatusBadge(order.order_status)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-end justify-end gap-2">
                    {order.order_status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Confirm
                      </Button>
                    )}
                    {order.order_status === 'confirmed' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Mark Shipped
                      </Button>
                    )}
                    {order.order_status === 'shipped' && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        disabled
                      >
                        Verify on Delivery
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Place Order Modal */}
      <Dialog.Root open={showOrderModal} onOpenChange={setShowOrderModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <Dialog.Content className="w-full max-w-md bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Place Order
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              {selectedQuote && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-600 font-semibold">UNIT PRICE</p>
                    <p className="text-lg font-bold text-teal-600">€{selectedQuote.quoted_unit_price}</p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">Order Number / Reference</label>
                    <Input
                      value={orderData.order_number}
                      onChange={(e) => setOrderData({...orderData, order_number: e.target.value})}
                      placeholder="Supplier's order confirmation number"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">Agreed Delivery Date</label>
                    <Input
                      type="date"
                      value={orderData.agreed_delivery_date}
                      onChange={(e) => setOrderData({...orderData, agreed_delivery_date: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold block mb-2">Notes</label>
                    <Textarea
                      value={orderData.notes}
                      onChange={(e) => setOrderData({...orderData, notes: e.target.value})}
                      placeholder="Any special instructions..."
                      className="resize-none h-20"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Dialog.Close asChild>
                      <Button variant="outline" className="flex-1">Cancel</Button>
                    </Dialog.Close>
                    <Button
                      onClick={handleSaveOrder}
                      className="flex-1 bg-teal-600 hover:bg-teal-700"
                    >
                      Place Order
                    </Button>
                  </div>
                </div>
              )}
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default OrderTrackingPanel;