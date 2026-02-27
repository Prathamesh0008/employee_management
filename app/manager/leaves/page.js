import LeaveReviewPanel from "@/components/leaves/LeaveReviewPanel";

export const metadata = {
  title: "Leave Review",
};

export default function ManagerLeavesPage() {
  return <LeaveReviewPanel title="Leave Review Queue" canReview canManageBalance />;
}
