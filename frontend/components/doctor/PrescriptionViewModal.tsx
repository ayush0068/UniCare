import { Appointment } from "@/store/appointmentStore";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Check, Copy, FileText, X } from "lucide-react";
import { Button } from "../ui/button";

interface PrescriptionViewModalProps {
  appointment: Appointment;
  userType: "doctor" | "patient";
  trigger: React.ReactNode;
}
const PrescriptionViewModal = ({
  appointment,
  userType,
  trigger,
}: PrescriptionViewModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const formateDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const copyToClipboard = async (text: string | undefined) => {
    try {
      if (text) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error("Failed to copy", error);
    }
  };

  const otherUser =
    userType === "doctor" ? appointment?.patientId : appointment?.doctorId;

  return (
    <>
      <span onClick={openModal} style={{ cursor: "pointer" }}>
        {trigger}
      </span>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader className="flex items-center flex-row justify-between space-y-0 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-green-600" />
                <CardTitle className="text-lg">Prescription</CardTitle>
              </div>

              <div className="flex items-center space-x-">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(appointment?.prescription)}
                  className="flex items-center space-x-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>

                <Button variant="ghost" size="sm" onClick={closeModal}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{otherUser?.name}</p>
                  <p className="text-sm text-gray-600">
                    {userType === "patient"
                      ? otherUser?.specialization
                      : `Age: ${otherUser?.age}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {formateDate(appointment?.slotStartIso)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {appointment.consultationType}
                  </p>
                </div>
              </div>

              <div className="border border-green-200 bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">
                  Prescription
                </h3>
                <div className="bg-white p-3 rounded border text-sm text-gray-800 whitespace-pre-wrap font-mono">
                  {appointment?.prescription}
                </div>
              </div>

              {appointment.notes && (
                <div className="border border-gray-200 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Notes</h3>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {appointment?.notes}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default PrescriptionViewModal;