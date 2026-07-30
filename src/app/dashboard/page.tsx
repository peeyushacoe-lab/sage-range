import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { StudentHome } from "./_components/student-home";
import { RecruiterHome } from "./_components/recruiter-home";
import { InstructorHome } from "./_components/instructor-home";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />
      {user.role === "RECRUITER"  && <RecruiterHome  user={user} />}
      {user.role === "INSTRUCTOR" && <InstructorHome user={user} />}
      {user.role === "ADMIN"      && <StudentHome    user={user} />}
      {(!user.role || user.role === "STUDENT") && <StudentHome user={user} />}
    </div>
  );
}
