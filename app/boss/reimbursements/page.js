import ReimbursementReviewPanel from "@/components/reimbursements/ReimbursementReviewPanel";
import connectDB from "@/lib/db";
import { requireUser } from "@/lib/session";
import Reimbursement from "@/models/Reimbursement";

export const metadata = {
  title: "Reimbursement Review",
};

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

export default async function BossReimbursementsPage() {
  await requireUser("boss");

  await connectDB();

  const reimbursements = await Reimbursement.find({})
    .sort({ createdAt: -1 })
    .populate("user", "name email role")
    .populate("reviewedBy", "name email role")
    .lean();

  return <ReimbursementReviewPanel initialReimbursements={toPlain(reimbursements)} />;
}
