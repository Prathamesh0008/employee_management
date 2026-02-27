import { redirect } from "next/navigation";

import { getDashboardPath, getSessionUser } from "@/lib/session";

export default async function HomePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  redirect(getDashboardPath(user.role));
}
