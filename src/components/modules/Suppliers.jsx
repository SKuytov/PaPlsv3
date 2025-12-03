
import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Edit, Star, Truck, Mail, Phone, 
  MapPin, Trash2, TrendingUp, Package, ArrowRight, Unlink 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dbService } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import PartDetailsModal from './spare-parts/PartDetailsModal';

const Suppliers = () => {
  const { userRole } = useAuth();
  const isGodAdmin = userRole?.name === 'God Admin';
  
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit/Create Supplier State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  
  // Details View State
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [linkedParts, setLinkedParts] = useState([]);
  const [loadingParts, setLoadingParts] = useState(false);
  
  // Part Details View State
  const [partToView, setPartToView] = useState(null);
  
  const { toast } = useToast();

  // Form State
  const [formData, setFormData] = useState({
    name: '', contact_person: '', email: '', phone: '', address: '',
    is_oem: false, quality_score: 80, delivery_score: 80, price_stability_score: 80
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getSuppliers();
      if (data) setSuppliers(data);
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load suppliers." });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await dbService.updateSupplier(editingSupplier.id, formData);
        toast({ title: "Updated", description: "Supplier details updated." });
      } else {
        await dbService.createSupplier(formData);
        toast({ title: "Created", description: "New supplier added." });
      }
      setModalOpen(false);
      loadSuppliers();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save supplier." });
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await dbService.deleteSupplier(deleteId);
      toast({ title: "Deleted", description: "Supplier removed." });
      setDeleteId(null);
      loadSuppliers();
    }
  };
  
  const handleViewDetails = async (supplier) => {
    setViewingSupplier(supplier);
    setLoadingParts(true);
    try {
      const { data } = await dbService.getPartsBySupplier(supplier.id);
      setLinkedParts(data || []);
    } catch(e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load linked parts" });
    } finally {
      setLoadingParts(false);
    }
  };

  const handleUnlinkPart = async (optionId) => {
    if (!isGodAdmin) return;
    if (!window.confirm("Are you sure you want to unlink this part?")) return;
    
    try {
        await dbService.removePartSupplier(optionId);
        // Refresh list
        const { data } = await dbService.getPartsBySupplier(viewingSupplier.id);
        setLinkedParts(data || []);
        toast({ title: "Unlinked", description: "Part removed from supplier." });
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: "Failed to unlink part" });
    }
  };

  const openModal = (supplier = null) => {
    setEditingSupplier(supplier);
    if (supplier) {
      setFormData({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        is_oem: supplier.is_oem || false,
        quality_score: supplier.quality_score || 80,
        delivery_score: supplier.delivery_score || 80,
        price_stability_score: supplier.price_stability_score || 80
      });
    } else {
      setFormData({
        name: '', contact_person: '', email: '', phone: '', address: '',
        is_oem: false, quality_score: 80, delivery_score: 80, price_stability_score: 80
      });
    }
    setModalOpen(true);
  };

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <LoadingSpinner message="Loading Suppliers..." />;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Supplier Management</h1>
            <p className="text-slate-600 mt-1">Vendor database, performance ratings, and sourcing</p>
          </div>
          <Button onClick={() => openModal()} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" /> Add Supplier
          </Button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border flex gap-4">
           <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(supplier => (
             <div key={supplier.id} className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-all relative group">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <h3 className="font-bold text-lg text-slate-800">{supplier.name}</h3>
                      <p className="text-sm text-slate-500">{supplier.contact_person || 'No Contact'}</p>
                   </div>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => openModal(supplier)}>
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      {isGodAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(supplier.id)}>
                           <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                   </div>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600 mb-6">
                   <div className="flex items-center gap-2"><Mail className="w-3 h-3"/> {supplier.email || '-'}</div>
                   <div className="flex items-center gap-2"><Phone className="w-3 h-3"/> {supplier.phone || '-'}</div>
                   <div className="flex items-center gap-2"><MapPin className="w-3 h-3"/> {supplier.address || '-'}</div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                   <div className="bg-slate-50 p-2 rounded border text-center">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Quality</div>
                      <div className="font-bold text-green-600 flex items-center justify-center gap-1 text-sm">
                         <Star className="w-3 h-3 fill-current" /> {supplier.quality_score}%
                      </div>
                   </div>
                   <div className="bg-slate-50 p-2 rounded border text-center">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Delivery</div>
                      <div className="font-bold text-blue-600 flex items-center justify-center gap-1 text-sm">
                         <Truck className="w-3 h-3" /> {supplier.delivery_score}%
                      </div>
                   </div>
                   <div className="bg-slate-50 p-2 rounded border text-center">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Price</div>
                      <div className="font-bold text-purple-600 flex items-center justify-center gap-1 text-sm">
                         <TrendingUp className="w-3 h-3" /> {supplier.price_stability_score}%
                      </div>
                   </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                   {supplier.is_oem ? (
                      <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded border border-purple-200">OEM Partner</span>
                   ) : (
                      <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">Alternative</span>
                   )}
                   <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => handleViewDetails(supplier)}>View Parts &rarr;</Button>
                </div>
             </div>
          ))}
          {filtered.length === 0 && <div className="col-span-full text-center py-12 text-slate-400">No suppliers found.</div>}
        </div>

        {/* Create / Edit Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
           <DialogContent className="max-w-lg">
              <DialogHeader>
                 <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'New Supplier'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 mt-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="text-sm font-medium">Company Name</label>
                       <input required className="w-full p-2 border rounded bg-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-sm font-medium">Contact Person</label>
                       <input className="w-full p-2 border rounded bg-white" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-sm font-medium">Email</label>
                       <input type="email" className="w-full p-2 border rounded bg-white" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-sm font-medium">Phone</label>
                       <input className="w-full p-2 border rounded bg-white" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-sm font-medium">Type</label>
                       <div className="flex items-center h-10 gap-2">
                          <input type="checkbox" id="is_oem" className="w-4 h-4" checked={formData.is_oem} onChange={e => setFormData({...formData, is_oem: e.target.checked})} />
                          <label htmlFor="is_oem" className="text-sm text-slate-600">Original Equipment Manufacturer (OEM)</label>
                       </div>
                    </div>
                    <div className="col-span-2">
                       <label className="text-sm font-medium">Address</label>
                       <input className="w-full p-2 border rounded bg-white" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                    </div>
                    
                    <div className="col-span-2 pt-2 border-t">
                       <h4 className="text-sm font-bold mb-2 text-slate-700">Performance Metrics (0-100)</h4>
                       <div className="grid grid-cols-3 gap-2">
                          <div>
                             <label className="text-xs text-slate-500">Quality</label>
                             <input type="number" max="100" className="w-full p-2 border rounded bg-white" value={formData.quality_score} onChange={e => setFormData({...formData, quality_score: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-xs text-slate-500">Delivery</label>
                             <input type="number" max="100" className="w-full p-2 border rounded bg-white" value={formData.delivery_score} onChange={e => setFormData({...formData, delivery_score: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-xs text-slate-500">Stability</label>
                             <input type="number" max="100" className="w-full p-2 border rounded bg-white" value={formData.price_stability_score} onChange={e => setFormData({...formData, price_stability_score: e.target.value})} />
                          </div>
                       </div>
                    </div>
                 </div>
                 <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-teal-600 hover:bg-teal-700">Save Supplier</Button>
                 </div>
              </form>
           </DialogContent>
        </Dialog>
        
        {/* Supplier Details / Linked Parts Modal */}
        <Dialog open={!!viewingSupplier} onOpenChange={(open) => !open && setViewingSupplier(null)}>
           <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 bg-white">
               {viewingSupplier && (
                   <>
                      <div className="p-6 border-b bg-slate-50">
                          <div className="flex justify-between items-start">
                              <div>
                                  <h2 className="text-2xl font-bold text-slate-800">{viewingSupplier.name}</h2>
                                  <div className="flex gap-4 mt-2 text-sm text-slate-600">
                                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {viewingSupplier.email}</span>
                                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {viewingSupplier.phone}</span>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="text-sm text-slate-500">Supplier ID</div>
                                  <div className="font-mono text-xs bg-white border px-2 py-1 rounded">{viewingSupplier.id.slice(0,8)}</div>
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex-1 overflow-hidden p-0">
                         <div className="p-4 bg-white border-b">
                            <h3 className="font-bold flex items-center gap-2 text-slate-700">
                               <Package className="w-4 h-4 text-teal-600" /> Linked Spare Parts
                            </h3>
                         </div>
                         
                         <ScrollArea className="h-[400px] md:h-[500px]">
                             {loadingParts ? (
                                 <div className="p-12 flex justify-center"><LoadingSpinner /></div>
                             ) : linkedParts.length === 0 ? (
                                 <div className="p-12 text-center text-slate-400 border-b">
                                     <p>No parts currently linked to this supplier.</p>
                                 </div>
                             ) : (
                                 <table className="w-full text-sm text-left">
                                     <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm">
                                         <tr>
                                             <th className="p-4 font-medium">Part Details</th>
                                             <th className="p-4 font-medium text-right">Unit Price</th>
                                             <th className="p-4 font-medium text-right">Lead Time</th>
                                             <th className="p-4 font-medium text-right">Actions</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y">
                                         {linkedParts.map((item) => (
                                             <tr key={item.id} className="hover:bg-slate-50 group">
                                                 <td className="p-4">
                                                     <div className="font-bold text-slate-800">{item.part?.name}</div>
                                                     <div className="text-xs text-slate-500 font-mono">{item.part?.part_number}</div>
                                                 </td>
                                                 <td className="p-4 text-right font-medium">
                                                     €{Number(item.unit_price).toFixed(2)}
                                                 </td>
                                                 <td className="p-4 text-right text-slate-600">
                                                     {item.lead_time_days} days
                                                 </td>
                                                 <td className="p-4 text-right">
                                                     <div className="flex justify-end gap-2">
                                                         <Button variant="ghost" size="sm" className="h-8" onClick={() => setPartToView(item.part)}>
                                                             View
                                                         </Button>
                                                         {isGodAdmin && (
                                                             <Button 
                                                               variant="ghost" 
                                                               size="sm" 
                                                               className="h-8 text-slate-400 hover:text-red-600"
                                                               onClick={() => handleUnlinkPart(item.id)}
                                                               title="Unlink Part"
                                                             >
                                                                 <Unlink className="w-4 h-4" />
                                                             </Button>
                                                         )}
                                                     </div>
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             )}
                         </ScrollArea>
                      </div>
                      
                      <div className="p-4 border-t bg-slate-50 flex justify-end">
                          <Button onClick={() => setViewingSupplier(null)}>Close Details</Button>
                      </div>
                   </>
               )}
           </DialogContent>
        </Dialog>
        
        {/* Part Details Modal - Integrated */}
        <PartDetailsModal 
            part={partToView} 
            onClose={() => setPartToView(null)}
            onDeleteRequest={() => {}} 
            onEditRequest={() => {}}
        />

        <AlertDialog.Root open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
           <AlertDialog.Portal>
              <AlertDialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
              <AlertDialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] bg-white p-6 rounded-lg shadow-xl">
                 <AlertDialog.Title className="font-bold text-lg">Delete Supplier?</AlertDialog.Title>
                 <AlertDialog.Description className="text-slate-600 my-4">
                    Are you sure you want to remove this supplier? This may affect linked parts and order history.
                 </AlertDialog.Description>
                 <div className="flex justify-end gap-3">
                    <AlertDialog.Cancel asChild><Button variant="outline">Cancel</Button></AlertDialog.Cancel>
                    <AlertDialog.Action asChild><Button onClick={handleDelete} variant="destructive">Delete</Button></AlertDialog.Action>
                 </div>
              </AlertDialog.Content>
           </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </ErrorBoundary>
  );
};

export default Suppliers;
