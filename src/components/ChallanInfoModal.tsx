import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Calendar, MapPin, User, FileText, IndianRupee } from "lucide-react";
import { format } from "date-fns";
import type { ChallanInfo } from "@/hooks/useChallanInfo";

interface ChallanInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  challanData: ChallanInfo | null;
  vehicleNumber?: string;
}

export const ChallanInfoModal: React.FC<ChallanInfoModalProps> = ({
  isOpen,
  onClose,
  challanData,
  vehicleNumber
}) => {
  if (!challanData) return null;

  const totalPending = challanData.challans
    .filter(c => c.challan_status !== 'Paid')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalPaid = challanData.challans
    .filter(c => c.challan_status === 'Paid')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-yellow-500" />
            Challan Information - {vehicleNumber || challanData.vehicleId}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Challans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{challanData.total}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-600">Pending Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₹{totalPending}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-600">Paid Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₹{totalPaid}</div>
              </CardContent>
            </Card>
          </div>

          {/* Challan List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {challanData.challans.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <AlertCircle className="mx-auto h-12 w-12 text-green-500 mb-2" />
                    <p className="text-lg font-medium">No Challans Found</p>
                    <p className="text-sm text-muted-foreground">
                      This vehicle has no traffic violations recorded.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                challanData.challans.map((challan, index) => (
                  <Card key={challan.challan_no || index} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {challan.challan_no}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(challan.date), 'dd MMM yyyy, hh:mm a')}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <Badge variant={challan.challan_status === 'Paid' ? 'default' : 'destructive'}>
                            {challan.challan_status}
                          </Badge>
                          <p className="text-lg font-bold mt-1">
                            <IndianRupee className="inline h-4 w-4" />
                            {challan.amount}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Accused:</span>
                          <span className="font-medium">{challan.accused_name}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Location:</span>
                          <span className="font-medium">{challan.area}, {challan.state}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">Offence:</p>
                        <p className="text-sm font-medium">{challan.offence}</p>
                        
                        {challan.offence_list && challan.offence_list.length > 0 && (
                          <ul className="mt-1 space-y-1">
                            {challan.offence_list.map((off, idx) => (
                              <li key={idx} className="text-xs text-muted-foreground pl-3">
                                • {off.offence_name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
