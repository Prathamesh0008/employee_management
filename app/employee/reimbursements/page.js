import EmployeeReimbursementPanel from "@/components/reimbursements/EmployeeReimbursementPanel";
import connectDB from "@/lib/db";
import { requireUser } from "@/lib/session";
import Reimbursement from "@/models/Reimbursement";

export const metadata = {
  title: "Reimbursements",
};

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

export default async function EmployeeReimbursementsPage() {
  const user = await requireUser("employee");

  await connectDB();

  const reimbursements = await Reimbursement.find({ user: user.id })
    .sort({ createdAt: -1 })
    .populate("reviewedBy", "name email role")
    .lean();

  return <EmployeeReimbursementPanel initialReimbursements={toPlain(reimbursements)} />;
}
