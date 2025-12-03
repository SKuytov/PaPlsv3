import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/components/ui/use-toast';
import { dbService } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const CategoryManager = ({ open, onOpenChange, onSuccess }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editName, setEditName] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  const loadCategories = async () => {
    setLoading(true);
    const { data } = await dbService.getCategories();
    if (data) setCategories(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const { error } = await dbService.createCategory(newCategoryName.trim());
      if (error) throw error;
      
      setNewCategoryName('');
      loadCategories();
      onSuccess?.();
      toast({ title: "Success", description: "Category added successfully." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not create category. Name might be duplicate." });
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    try {
      const { error } = await dbService.updateCategory(id, { name: editName.trim() });
      if (error) throw error;

      setEditingId(null);
      loadCategories();
      onSuccess?.();
      toast({ title: "Success", description: "Category updated." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update category." });
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await dbService.deleteCategory(deleteId);
      if (error) throw error;
      
      loadCategories();
      onSuccess?.();
      toast({ title: "Deleted", description: "Category removed." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete category. It might be in use." });
    } finally {
      setDeleteId(null);
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-teal-600" /> Manage Categories
            </DialogTitle>
            <DialogDescription>
              Create, edit, or remove part categories.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            {/* Add New */}
            <div className="flex gap-2 items-center">
              <Input 
                placeholder="New Category Name..." 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <Button onClick={handleAdd} disabled={!newCategoryName.trim()} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* List */}
            <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="p-4 flex justify-center"><LoadingSpinner size="sm" /></div>
              ) : categories.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">No categories found.</div>
              ) : (
                categories.map(cat => (
                  <div key={cat.id} className="p-3 flex items-center justify-between hover:bg-slate-50 group">
                    {editingId === cat.id ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <Input 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)} 
                          className="h-8"
                          autoFocus
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleUpdate(cat.id)} className="h-8 w-8 p-0 text-green-600">
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 p-0 text-slate-400">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(cat)} className="h-8 w-8 p-0 text-blue-600">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteId(cat.id)} className="h-8 w-8 p-0 text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this category. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CategoryManager;