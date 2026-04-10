import ProfilePage from "@/components/ProfilePage/ProfilePage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patient Profile | MediCare+",
  description: "View and manage your patient profile in MediCare+ platform.",
};

export default function Page() {
  return <ProfilePage userType='patient'/>
}