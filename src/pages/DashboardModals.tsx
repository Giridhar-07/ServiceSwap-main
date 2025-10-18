import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  editOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
  deleteOpen: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  selectedListing: any | null;
  editData: any;
  setEditData: (data: any) => void;
  setMyListings: React.Dispatch<React.SetStateAction<any[]>>;
  toast: (opts: { title: string; description?: string; variant?: string }) => void;
};

const DashboardModals: React.FC<Props> = ({
  editOpen,
  onEditOpenChange,
  deleteOpen,
  onDeleteOpenChange,
  selectedListing,
  editData,
  setEditData,
  setMyListings,
  toast,
}) => {
  return (
    <>
      <Dialog open={editOpen} onOpenChange={onEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>Update your listing details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
            <Textarea placeholder="Description" value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} />
            <Select value={editData.category} onValueChange={(v) => setEditData({ ...editData, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="streaming">Streaming</SelectItem>
                <SelectItem value="fitness">Fitness</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="gaming">Gaming</SelectItem>
                <SelectItem value="software">Software</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Price" value={editData.price} onChange={(e) => setEditData({ ...editData, price: Number(e.target.value) })} />
              <Input type="number" placeholder="Original Price" value={editData.originalPrice} onChange={(e) => setEditData({ ...editData, originalPrice: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Users/Slots" value={editData.users} onChange={(e) => setEditData({ ...editData, users: Number(e.target.value) })} />
              <Input placeholder="Location" value={editData.location} onChange={(e) => setEditData({ ...editData, location: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => onEditOpenChange(false)}>Cancel</Button>
              <Button type="button" onClick={async () => {
                try {
                  const token = localStorage.getItem('serviceswap_token');
                  if (!token || !selectedListing) return;
                  const res = await fetch(`/api/services/${selectedListing.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(editData),
                  });
                  if (!res.ok) throw new Error('Failed to update');
                  const updated = await res.json();
                  setMyListings(prev => prev.map(l => l.id === selectedListing.id ? {
                    id: updated._id,
                    title: updated.title,
                    category: updated.category,
                    price: updated.price,
                    originalPrice: updated.originalPrice,
                    status: updated.status,
                    views: updated.views ?? l.views,
                    interested: Array.isArray(updated.interestedUsers) ? updated.interestedUsers.length : l.interested,
                    slotsLeft: updated.users ?? l.slotsLeft,
                    createdAt: updated.createdAt,
                    description: updated.description ?? l.description,
                    location: updated.location ?? l.location,
                    users: updated.users ?? l.users,
                  } : l));
                  onEditOpenChange(false);
                  toast({ title: 'Service updated', description: 'Your listing has been updated.' });
                } catch (e) {
                  toast({ title: 'Failed to update service', variant: 'destructive' });
                }
              }}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this service?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your listing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              try {
                const token = localStorage.getItem('serviceswap_token');
                if (!token || !selectedListing) return;
                const res = await fetch(`/api/services/${selectedListing.id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('Failed to delete');
                setMyListings(prev => prev.filter(l => l.id !== selectedListing.id));
                onDeleteOpenChange(false);
                toast({ title: 'Service deleted', description: 'Listing removed successfully.' });
              } catch (e) {
                toast({ title: 'Failed to delete service', variant: 'destructive' });
              }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DashboardModals;