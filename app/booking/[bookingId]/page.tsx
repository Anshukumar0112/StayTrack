import { redirect } from "next/navigation";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  redirect(`/trips/${bookingId}`);
}
