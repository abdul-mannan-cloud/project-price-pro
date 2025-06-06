import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Save, Plus, MinusCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";


export const LeadEditDialog = ({ lead, isOpen, onClose, onLeadUpdated }) => {
  const [editedLead, setEditedLead] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  // Initialize form with lead data
  useEffect(() => {
    if (lead) {
      // Create a deep copy to avoid mutating the original data
      setEditedLead(JSON.parse(JSON.stringify(lead)));
    }
  }, [lead]);

  // Handle changes to project title and description
  const handleBasicInfoChange = (e) => {
    if (!editedLead) return;
    
    setEditedLead({
      ...editedLead,
      [e.target.name]: e.target.value
    });
  };

  // Handle changes to line items
  const handleLineItemChange = (
    groupIndex,
    subgroupIndex,
    itemIndex,
    field,
    value
  ) => {
    if (!editedLead?.estimate_data?.groups) return;
    
    const newGroups = JSON.parse(JSON.stringify(editedLead.estimate_data.groups));
    const item = newGroups[groupIndex].subgroups[subgroupIndex].items[itemIndex];
    
    // Update the field
    if (field === 'quantity') {
      // Convert to number and ensure it's positive
      const newQuantity = Math.max(1, Number(value));
      item.quantity = newQuantity;
      
      // Recalculate total price
      item.totalPrice = newQuantity * item.unitAmount;
    } else if (field === 'unitAmount') {
      // Convert to number and ensure it's positive
      const newUnitAmount = Math.max(0, Number(value));
      item.unitAmount = newUnitAmount;
      
      // Recalculate total price
      item.totalPrice = item.quantity * newUnitAmount;
    } else {
      // For text fields like title and description
      item[field] = value;
    }
    
    // Recalculate subtotals and total cost
    recalculateEstimateTotals(newGroups);
    
    // Update state
    setEditedLead({
      ...editedLead,
      estimate_data: {
        ...editedLead.estimate_data,
        groups: newGroups
      }
    });
  };
  
  // Add a new line item to a subgroup
  const handleAddLineItem = (groupIndex, subgroupIndex) => {
    if (!editedLead?.estimate_data?.groups) return;
    
    const newGroups = JSON.parse(JSON.stringify(editedLead.estimate_data.groups));
    
    // Create a new line item with default values
    const newItem = {
      title: "New Item",
      description: "",
      quantity: 1,
      unitAmount: 0,
      totalPrice: 0
    };
    
    // Add the new item to the specified subgroup
    newGroups[groupIndex].subgroups[subgroupIndex].items.push(newItem);
    
    // Recalculate subtotals and total cost
    recalculateEstimateTotals(newGroups);
    
    // Update state
    setEditedLead({
      ...editedLead,
      estimate_data: {
        ...editedLead.estimate_data,
        groups: newGroups
      }
    });
  };
  
  // Delete a line item from a subgroup
  const handleDeleteLineItem = (groupIndex, subgroupIndex, itemIndex) => {
    if (!editedLead?.estimate_data?.groups) return;
    
    const newGroups = JSON.parse(JSON.stringify(editedLead.estimate_data.groups));
    
    // Remove the item from the subgroup
    newGroups[groupIndex].subgroups[subgroupIndex].items.splice(itemIndex, 1);
    
    // Recalculate subtotals and total cost
    recalculateEstimateTotals(newGroups);
    
    // Update state
    setEditedLead({
      ...editedLead,
      estimate_data: {
        ...editedLead.estimate_data,
        groups: newGroups
      }
    });
  };
  
  // Recalculate all subtotals and total cost
  const recalculateEstimateTotals = (groups) => {
    if (!editedLead?.estimate_data) return;
    
    let totalCost = 0;
    
    // Recalculate each group's subtotal
    groups.forEach(group => {
      let groupTotal = 0;
      
      // Recalculate each subgroup's subtotal
      group.subgroups.forEach(subgroup => {
        let subgroupTotal = 0;
        
        // Sum up all line items in the subgroup
        subgroup.items.forEach(item => {
          subgroupTotal += item.totalPrice;
        });
        
        subgroup.subtotal = subgroupTotal;
        groupTotal += subgroupTotal;
      });
      
      group.subtotal = groupTotal;
      totalCost += groupTotal;
    });
    
    // Update the estimate's total cost in both places
    setEditedLead({
      ...editedLead,
      estimate_data: {
        ...editedLead.estimate_data,
        groups: groups,
        totalCost: totalCost
      },
      estimated_cost: totalCost
    });
  };
  /** 
 * Remove any blank items / sub-groups / groups 
 */
function pruneEmptySections(est: any) {
  if (!est?.groups) return est;

  est.groups = est.groups
    .map((g: any) => ({
      ...g,
      subgroups: (g.subgroups || [])
        .map((sg: any) => ({
          ...sg,
          items: (sg.items || []).filter((it: any) =>
            it.title?.trim() ||
            it.description?.trim() ||
            Number(it.unitAmount) > 0
          ),
        }))
        // ── keep only sub-groups with at least one item
        .filter((sg: any) => sg.items.length),
    }))
    // ── keep only groups with at least one sub-group
    .filter((g: any) => g.subgroups.length);

  return est;
}


  // Handle save
const handleSave = async () => {
  if (!editedLead) return;
  setIsSaving(true);

  try {
    // ── CLEAN before saving ───────────────────────────────────────
    const cleaned = pruneEmptySections(editedLead.estimate_data);
    // ensure totalCost propagated
    const updatedCost = cleaned.totalCost;

    const updatePayload = {
      project_title:    editedLead.project_title,
      project_description: editedLead.project_description,
      estimate_data:    cleaned,
      estimated_cost:   updatedCost,
    };

    console.log("Saving lead with payload:", updatePayload);

    const { data, error } = await supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", editedLead.id)
      .select();
    if (error) throw error;

    toast({ title: "Success", description: "Lead updated successfully" });
    queryClient.invalidateQueries(["lead", editedLead.id]);
    queryClient.invalidateQueries(["leads"]);
    onLeadUpdated(data?.[0] || editedLead);
    onClose();
  } catch (err) {
    console.error("Error updating lead:", err);
    toast({
      title: "Error",
      description: "Failed to update lead. Please try again.",
      variant: "destructive",
    });
  } finally {
    setIsSaving(false);
  }
};


  // Handle delete
  const handleDelete = async () => {
    if (!editedLead) return;
    
    setIsDeleting(true);
    
    try {
      // Delete lead from database
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', editedLead.id);
      
      if (error) throw error;
      
      // Show success toast
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['leads']);
      
      // Close the dialogs
      setShowDeleteDialog(false);
      onClose();
      
      // Notify parent component
      onLeadUpdated(null, true); // Pass true as second parameter to indicate deletion
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({
        title: "Error",
        description: "Failed to delete lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!editedLead) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>
              Make changes to the lead information and line items.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="project_title">Project Title</Label>
                <Input
                  id="project_title"
                  name="project_title"
                  value={editedLead.project_title || ''}
                  onChange={handleBasicInfoChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="project_description">Project Description</Label>
                <Textarea
                  id="project_description"
                  name="project_description"
                  value={editedLead.project_description || ''}
                  onChange={handleBasicInfoChange}
                  rows={3}
                />
              </div>
            </div>
            
            {/* Line Items */}
            {editedLead.estimate_data?.groups && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Line Items</h3>
                
                {editedLead.estimate_data.groups.map((group, groupIndex) => (
                  <div key={`group-${groupIndex}`} className="space-y-4 border p-4 rounded-md">
                    <h4 className="font-medium">{group.name}</h4>
                    
                    {group.subgroups.map((subgroup, subgroupIndex) => (
                      <div key={`subgroup-${groupIndex}-${subgroupIndex}`} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h5 className="text-sm font-medium text-muted-foreground">{subgroup.name}</h5>
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAddLineItem(groupIndex, subgroupIndex)}
                            className="h-8 px-2"
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add Item
                          </Button>
                        </div>
                        
                        {subgroup.items.map((item, itemIndex) => (
                          <div 
                            key={`item-${groupIndex}-${subgroupIndex}-${itemIndex}`} 
                            className="grid grid-cols-12 gap-2 border-b pb-3"
                          >
                            <div className="col-span-12 sm:col-span-5">
                              <Label 
                                htmlFor={`item-title-${groupIndex}-${subgroupIndex}-${itemIndex}`}
                                className="text-xs"
                              >
                                Title
                              </Label>
                              <Input
                                id={`item-title-${groupIndex}-${subgroupIndex}-${itemIndex}`}
                                value={item.title}
                                onChange={(e) => handleLineItemChange(
                                  groupIndex, 
                                  subgroupIndex, 
                                  itemIndex, 
                                  'title', 
                                  e.target.value
                                )}
                                className="h-8"
                              />
                            </div>
                            
                            <div className="col-span-4 sm:col-span-2">
                              <Label 
                                htmlFor={`item-qty-${groupIndex}-${subgroupIndex}-${itemIndex}`}
                                className="text-xs"
                              >
                                Quantity
                              </Label>
                              <Input
                                id={`item-qty-${groupIndex}-${subgroupIndex}-${itemIndex}`}
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleLineItemChange(
                                  groupIndex, 
                                  subgroupIndex, 
                                  itemIndex, 
                                  'quantity', 
                                  e.target.value
                                )}
                                className="h-8"
                              />
                            </div>
                            
                            <div className="col-span-4 sm:col-span-2">
                              <Label 
                                htmlFor={`item-price-${groupIndex}-${subgroupIndex}-${itemIndex}`}
                                className="text-xs"
                              >
                                Unit Price
                              </Label>
                              <Input
                                id={`item-price-${groupIndex}-${subgroupIndex}-${itemIndex}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitAmount}
                                onChange={(e) => handleLineItemChange(
                                  groupIndex, 
                                  subgroupIndex, 
                                  itemIndex, 
                                  'unitAmount', 
                                  e.target.value
                                )}
                                className="h-8"
                              />
                            </div>
                            
                            <div className="col-span-3 sm:col-span-2">
                              <Label className="text-xs">Total</Label>
                              <div className="h-8 flex items-center text-sm">
                                ${item.totalPrice.toFixed(2)}
                              </div>
                            </div>
                            
                            <div className="col-span-1 sm:col-span-1 flex items-end justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLineItem(groupIndex, subgroupIndex, itemIndex)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                              >
                                <MinusCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        
                        <div className="text-right text-sm">
                          Subtotal: ${subgroup.subtotal.toFixed(2)}
                        </div>
                      </div>
                    ))}
                    
                    <div className="text-right font-medium">
                      Group Total: ${group.subtotal.toFixed(2)}
                    </div>
                  </div>
                ))}
                
                <div className="text-right text-lg font-bold">
                  Total Estimate: ${editedLead.estimate_data.totalCost.toFixed(2)}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between items-center">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="mr-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Lead
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this lead 
              and all associated estimate data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// PropTypes for JavaScript validation
LeadEditDialog.propTypes = {
  lead: PropTypes.shape({
    id: PropTypes.string.isRequired,
    project_title: PropTypes.string,
    project_description: PropTypes.string,
    estimate_data: PropTypes.shape({
      groups: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string.isRequired,
          description: PropTypes.string,
          subgroups: PropTypes.arrayOf(
            PropTypes.shape({
              name: PropTypes.string.isRequired,
              items: PropTypes.arrayOf(
                PropTypes.shape({
                  title: PropTypes.string.isRequired,
                  description: PropTypes.string,
                  quantity: PropTypes.number.isRequired,
                  unitAmount: PropTypes.number.isRequired,
                  totalPrice: PropTypes.number.isRequired
                })
              ).isRequired,
              subtotal: PropTypes.number.isRequired
            })
          ).isRequired,
          subtotal: PropTypes.number
        })
      ),
      totalCost: PropTypes.number.isRequired
    })
  }),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onLeadUpdated: PropTypes.func.isRequired
};

export default LeadEditDialog;