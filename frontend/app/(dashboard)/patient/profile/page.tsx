import ProfilePage from "@/components/ProfilePage/ProfilePage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patient Profile | UniCare+",
  description: "View and manage your patient profile in UniCare+ platform.",
};

export default function Page() {
  return <ProfilePage userType='patient'/>
}